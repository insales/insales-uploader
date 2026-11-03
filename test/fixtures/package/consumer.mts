import uploader, {type Options, type UpdateEvent} from 'insales-uploader';

const onUpdate = async (update: UpdateEvent): Promise<void> => { console.log(update.path); };
const options: Options = {
  account: {id: '1', token: 'fixture', url: 'example.com'},
  theme: {id: 42, onUpdate},
};
void new uploader(options).downloadTemplates();
void uploader(options).stopStream();
