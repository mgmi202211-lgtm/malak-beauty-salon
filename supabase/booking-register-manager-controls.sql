-- Unified booking register: active users can read, managers alone can write.
create policy customers_active_profiles_select on public.customers for select to authenticated using (private.current_profile_role() is not null);
create policy services_active_profiles_select on public.services for select to authenticated using (private.current_profile_role() is not null and active = true);
create policy bookings_active_profiles_select on public.bookings for select to authenticated using (private.current_profile_role() is not null);
create policy booking_services_active_profiles_select on public.booking_services for select to authenticated using (private.current_profile_role() is not null);
create policy booking_payments_active_profiles_select on public.booking_payments for select to authenticated using (private.current_profile_role() is not null);
create policy booking_revenues_active_profiles_select on public.booking_revenues for select to authenticated using (private.current_profile_role() is not null);

create or replace function public.manager_update_booking(
  p_booking_id bigint, p_customer_id bigint, p_booking_date date,
  p_booking_time time without time zone, p_status text, p_notes text,
  p_discount_amount numeric, p_service_lines jsonb
) returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_first_service_id bigint;
  v_subtotal numeric(12,2);
  v_net_total numeric(12,2);
begin
  if not private.is_manager() then raise exception 'هذه العملية متاحة للمدير فقط.'; end if;
  if p_status not in ('pending','completed','cancelled') then raise exception 'حالة الحجز غير صحيحة.'; end if;
  if coalesce(p_discount_amount, 0) < 0 then raise exception 'قيمة الخصم لا يمكن أن تكون سالبة.'; end if;
  if jsonb_typeof(p_service_lines) <> 'array' or jsonb_array_length(p_service_lines) = 0 then raise exception 'يجب اختيار خدمة واحدة على الأقل.'; end if;
  if exists (select 1 from jsonb_array_elements(p_service_lines) as x(item)
    where nullif(item->>'service_id','') is null or nullif(item->>'price','') is null or (item->>'price')::numeric < 0) then
    raise exception 'بيانات الخدمات أو الأسعار غير صحيحة.';
  end if;
  select (item->>'service_id')::bigint into v_first_service_id
  from jsonb_array_elements(p_service_lines) with ordinality as x(item, ord) order by ord limit 1;
  select coalesce(sum((item->>'price')::numeric), 0) into v_subtotal
  from jsonb_array_elements(p_service_lines) as x(item);
  if coalesce(p_discount_amount, 0) > v_subtotal then raise exception 'قيمة الخصم أكبر من إجمالي الخدمات.'; end if;
  v_net_total := v_subtotal - coalesce(p_discount_amount, 0);
  update public.bookings set customer_id=p_customer_id, service_id=v_first_service_id,
    booking_date=p_booking_date, booking_time=p_booking_time, status=p_status,
    notes=p_notes, discount_amount=coalesce(p_discount_amount,0)
  where id=p_booking_id;
  if not found then raise exception 'الحجز غير موجود.'; end if;
  delete from public.booking_services where booking_id=p_booking_id;
  insert into public.booking_services (booking_id,service_id,price)
  select p_booking_id,(item->>'service_id')::bigint,(item->>'price')::numeric
  from jsonb_array_elements(p_service_lines) as x(item);
  if p_status='completed' then
    insert into public.booking_revenues (booking_id,amount,revenue_date)
    values (p_booking_id,v_net_total,p_booking_date)
    on conflict (booking_id) do update set amount=excluded.amount,revenue_date=excluded.revenue_date;
  else
    delete from public.booking_revenues where booking_id=p_booking_id;
  end if;
end;
$function$;

create or replace function public.manager_delete_booking(p_booking_id bigint)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not private.is_manager() then raise exception 'حذف الحجوزات متاح للمدير فقط.'; end if;
  if not exists (select 1 from public.bookings where id=p_booking_id) then raise exception 'الحجز غير موجود.'; end if;
  delete from public.booking_payments where booking_id=p_booking_id;
  delete from public.booking_revenues where booking_id=p_booking_id;
  delete from public.booking_services where booking_id=p_booking_id;
  delete from public.bookings where id=p_booking_id;
end;
$function$;
revoke all on function public.manager_delete_booking(bigint) from public;
grant execute on function public.manager_delete_booking(bigint) to authenticated;