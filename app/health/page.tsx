export default async function Health() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/work_areas?select=id,name&limit=1`
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  const text = await res.text()
  return <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>{`STATUS: ${res.status}\nURL: ${url}\n\n${text}`}</pre>
}
