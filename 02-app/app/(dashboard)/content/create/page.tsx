import { redirect } from 'next/navigation'

/**
 * `/content/create` index — redirects to the picker. The actual generation
 * surface lives at `/content/create/[slug]`. Bare `/content/create` has no
 * meaning on its own; redirect rather than 404 so the legacy sidebar link
 * (pre-OUT-02-P4a) keeps working until everyone's nav-config caches refresh.
 */
export default function ContentCreateIndex() {
  redirect('/content')
}
