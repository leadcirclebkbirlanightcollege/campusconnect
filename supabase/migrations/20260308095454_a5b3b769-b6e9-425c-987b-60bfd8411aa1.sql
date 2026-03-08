-- Enable realtime for platform_settings so ForceUpdateBanner receives live pushes
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
