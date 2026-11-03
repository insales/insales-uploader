import uploader = require('insales-uploader');

const options: uploader.Options = {
  account: {id: 1, token: 'fixture', url: 'example.com'},
  theme: {id: '42', onUpdate: update => { const event: 'add' | 'change' | 'unlink' = update.event; console.log(event); }},
};
const first: uploader.Instance = uploader(options);
const second: uploader.Instance = new uploader(options);
const callback: uploader.UpdateCallback = async event => { console.log(event.path, event.asset.type); };
void first.stream(callback);
void second.download(['Asset::Media']);
void first.backup().then((archive: string) => console.log(archive));

// @ts-expect-error Gulp APIs were intentionally removed in v2.
first.src('*.js');
// @ts-expect-error Asset types are a finite set, not arbitrary strings.
void second.download(['Media']);
// @ts-expect-error Account token is required.
uploader({account: {id: 1, url: 'example.com'}, theme: {id: 42}});
