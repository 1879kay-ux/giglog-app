drop extension if exists "pg_net";

drop policy "app_settings_insert_all" on "public"."app_settings";

drop policy "app_settings_select_all" on "public"."app_settings";

drop policy "app_settings_update_all" on "public"."app_settings";


  create policy "app_settings_insert_all"
  on "public"."app_settings"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "app_settings_select_all"
  on "public"."app_settings"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "app_settings_update_all"
  on "public"."app_settings"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Allow authenticated deletes"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'band-logos'::text));



  create policy "Allow authenticated updates"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'band-logos'::text))
with check ((bucket_id = 'band-logos'::text));



  create policy "Allow authenticated uploads"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'band-logos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Public read band logos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'band-logos'::text));



  create policy "band admins can delete band-docs"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'band-docs'::text) AND (EXISTS ( SELECT 1
   FROM public.band_members bm
  WHERE ((bm.auth_user_id = auth.uid()) AND (bm.is_active = true) AND (bm.is_admin = true) AND ((bm.band_id)::text = (storage.foldername(objects.name))[2]))))));



  create policy "band admins can delete event-docs"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'event-docs'::text) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.band_members bm ON ((bm.band_id = e.band_id)))
  WHERE ((bm.auth_user_id = auth.uid()) AND (bm.is_active = true) AND (bm.is_admin = true) AND (bm.admin_mode_enabled = true) AND (objects.name ~~ (('events/'::text || e.event_id) || '/%'::text)))))));



  create policy "band admins can upload event-docs"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'event-docs'::text) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.band_members bm ON ((bm.band_id = e.band_id)))
  WHERE ((bm.auth_user_id = auth.uid()) AND (bm.is_active = true) AND (bm.is_admin = true) AND (bm.admin_mode_enabled = true) AND (objects.name ~~ (('events/'::text || e.event_id) || '/%'::text)))))));



  create policy "band members can read band-docs"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'band-docs'::text) AND (EXISTS ( SELECT 1
   FROM public.band_members bm
  WHERE ((bm.auth_user_id = auth.uid()) AND (objects.name ~~ (('bands/'::text || (bm.band_id)::text) || '/%'::text)))))));



  create policy "band members can read event-docs"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'event-docs'::text) AND (EXISTS ( SELECT 1
   FROM (public.events e
     JOIN public.band_members bm ON ((bm.band_id = e.band_id)))
  WHERE ((bm.auth_user_id = auth.uid()) AND (bm.is_active = true) AND (objects.name ~~ (('events/'::text || e.event_id) || '/%'::text)))))));



  create policy "band members can upload band-docs"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'band-docs'::text) AND (EXISTS ( SELECT 1
   FROM public.band_members bm
  WHERE ((bm.auth_user_id = auth.uid()) AND (objects.name ~~ (('bands/'::text || (bm.band_id)::text) || '/%'::text)))))));



