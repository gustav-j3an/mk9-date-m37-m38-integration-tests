WITH inventory(kind, object_name, definition) AS (
  SELECT 'column', 'public.visits.regularization_status',
         format_type(a.atttypid, a.atttypmod) || '|not_null=' || a.attnotnull::text || '|default=' || COALESCE(pg_get_expr(d.adbin, d.adrelid), '<null>')
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relname = 'visits' AND a.attname = 'regularization_status' AND NOT a.attisdropped
  UNION ALL
  SELECT 'table', 'public.visit_regularization_audit',
         'rls=' || c.relrowsecurity::text || '|forced=' || c.relforcerowsecurity::text || '|acl=' || COALESCE(c.relacl::text, '<default>')
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'visit_regularization_audit'
  UNION ALL
  SELECT 'constraint', con.conrelid::regclass::text || '.' || con.conname, pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  WHERE con.conrelid IN ('public.visits'::regclass, 'public.visit_regularization_audit'::regclass)
    AND (con.conrelid = 'public.visit_regularization_audit'::regclass OR con.conname ILIKE '%regularization%')
  UNION ALL
  SELECT 'index', schemaname || '.' || tablename || '.' || indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public' AND (tablename = 'visit_regularization_audit' OR indexname ILIKE '%regularization%')
  UNION ALL
  SELECT 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid)
  FROM pg_trigger t
  WHERE NOT t.tgisinternal AND (t.tgname ILIKE '%regularization%' OR t.tgrelid = 'public.visit_regularization_audit'::regclass)
  UNION ALL
  SELECT 'function', p.oid::regprocedure::text,
         md5(pg_get_functiondef(p.oid)) || '|security_definer=' || p.prosecdef::text || '|config=' || COALESCE(p.proconfig::text, '<null>') || '|acl=' || COALESCE(p.proacl::text, '<default>')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE (n.nspname = 'attendance_private' AND p.proname ILIKE '%regularization%')
     OR (n.nspname = 'attendance_private' AND p.proname IN ('is_visit_from_an_earlier_operational_day', 'regularize_old_open_visit'))
     OR (n.nspname = 'public' AND p.proname = 'attendance_regularize_visit')
  UNION ALL
  SELECT 'policy', schemaname || '.' || tablename || '.' || policyname,
         cmd || '|permissive=' || permissive || '|roles=' || roles::text || '|using=' || COALESCE(qual, '<null>') || '|check=' || COALESCE(with_check, '<null>')
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'visit_regularization_audit'
  UNION ALL
  SELECT 'row-count', 'public.visits', count(*)::text FROM public.visits
  UNION ALL
  SELECT 'row-count', 'public.visit_regularization_audit', count(*)::text FROM public.visit_regularization_audit
)
SELECT COALESCE(jsonb_agg(jsonb_build_object('kind', kind, 'name', object_name, 'definition', definition) ORDER BY kind, object_name), '[]'::jsonb)::text
FROM inventory;
