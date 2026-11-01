// JSON adapter: credentials belong in headers, never in URLs or diagnostics.
export default function createClient(config) {
  async function request(options, method, resource, body, raw = false) {
    const url = new URL(`/admin/${resource}.json`, `${config.http ? 'http' : 'https'}://${options.url}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.timeout || 30000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.id}:${options.token}`).toString('base64')}`,
        Accept: 'application/json',
        ...(body === undefined ? {} : {'Content-Type': 'application/json'})
      },
      ...(body === undefined ? {} : {body: JSON.stringify(body)})
    });
    // The raw asset endpoint also serves images/fonts; decoding them as UTF-8
    // irreversibly corrupts bytes. Keep error responses readable as before.
    const bytes = raw === 'buffer' && response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    const text = bytes === null ? await response.text() : '';
    let data = text;
    if ((!raw || !response.ok) && text) {
      try { data = JSON.parse(text); } catch {
        if (response.ok) throw new Error(`Invalid JSON response: ${method} ${url.pathname}`);
      }
    }
    if (!response.ok) {
      const error = new Error(`InSales API ${response.status}: ${method} ${url.pathname}`);
      error.statusCode = response.status;
      error.response = {statusCode: response.status, headers: Object.fromEntries(response.headers), data};
      throw error;
    }
    return {data: bytes === null ? data : bytes, response: {statusCode: response.status, headers: Object.fromEntries(response.headers)}};
  }
  const assets = o => `themes/${encodeURIComponent(o.theme)}/assets`;
  const widgets = o => `themes/${encodeURIComponent(o.theme)}/widget_types`;
  const asset = o => `${assets(o)}/${encodeURIComponent(o.assetId)}`;
  const widget = o => `${widgets(o)}/${encodeURIComponent(o.widgetId)}`;
  return {
    listThemes: o => request(o, 'GET', 'themes'),
    listAsset: o => request(o, 'GET', assets(o)),
    getAsset: o => request(o, 'GET', asset(o)),
    getAssetRaw: o => request(o, 'GET', `${asset(o)}/raw`, undefined, o.binary ? 'buffer' : true),
    uploadAsset: o => request(o, 'POST', assets(o), {asset: o.asset}),
    editAsset: o => request(o, 'PUT', asset(o), {asset: o.asset}),
    removeAsset: o => request(o, 'DELETE', asset(o)),
    listWidgetTypes: o => request(o, 'GET', widgets(o)),
    uploadWidgetType: o => request(o, 'POST', widgets(o), o.data),
    editWidgetType: o => request(o, 'PUT', widget(o), o.data),
    removeWidgetType: o => request(o, 'DELETE', widget(o)),
    listFile: o => request(o, 'GET', 'files'),
    uploadFile: o => request(o, 'POST', 'files', o.files)
  };
}
