import { Brand, Notice, PageHeading, Screen } from '../../components/common/ui';
import { NavLink } from '../../components/common/NavLink';
import { isSupabaseConfigured } from '../../database/supabase/client';

export function AuthShell({ children, title, description, back = '/welcome' }) {
  return <Screen keyboard>
    <Brand />
    <NavLink href={back}>← Back</NavLink>
    <PageHeading eyebrow="YOUR NEXT CHAPTER" title={title} description={description} />
    {!isSupabaseConfigured && <Notice text="Setup needed: add your Supabase project URL and publishable key to .env, then restart Expo. See README.md." />}
    {children}
  </Screen>;
}
