export interface ArabicChatEmojiItem {
  id: string; // unique id (usually same as code without colons)
  code: string; // :amazing:
  name?: string; // optional display name
  url: string; // absolute URL to the png/gif
}

export interface ArabicChatEmojiCatalog {
  base: ArabicChatEmojiItem[];
  food: ArabicChatEmojiItem[];
  stickers: ArabicChatEmojiItem[];
}

const baseUrl = 'https://storage.arabic.chat/emoticon';

// Core set extracted from arabic.chat room picker
const base: ArabicChatEmojiItem[] = [
  { id: 'amazing', code: ':amazing:', name: 'Amazing', url: `${baseUrl}/amazing.png` },
  { id: 'angel', code: ':angel:', name: 'Angel', url: `${baseUrl}/angel.png` },
  { id: 'angry', code: ':angry:', name: 'Angry', url: `${baseUrl}/angry.png` },
  { id: 'anxious', code: ':anxious:', name: 'Anxious', url: `${baseUrl}/anxious.png` },
  { id: 'bad', code: ':bad:', name: 'Bad', url: `${baseUrl}/bad.png` },
  { id: 'bigsmile', code: ':bigsmile:', name: 'Big Smile', url: `${baseUrl}/bigsmile.png` },
  { id: 'blink', code: ':blink:', name: 'Blink', url: `${baseUrl}/blink.png` },
  { id: 'cool', code: ':cool:', name: 'Cool', url: `${baseUrl}/cool.png` },
  { id: 'crisped', code: ':crisped:', name: 'Crisped', url: `${baseUrl}/crisped.png` },
  { id: 'cry', code: ':cry:', name: 'Cry', url: `${baseUrl}/cry.png` },
  { id: 'cry2', code: ':cry2:', name: 'Cry 2', url: `${baseUrl}/cry2.png` },
  { id: 'dead', code: ':dead:', name: 'Dead', url: `${baseUrl}/dead.png` },
  { id: 'desperate', code: ':desperate:', name: 'Desperate', url: `${baseUrl}/desperate.png` },
  { id: 'devil', code: ':devil:', name: 'Devil', url: `${baseUrl}/devil.png` },
  { id: 'doubt', code: ':doubt:', name: 'Doubt', url: `${baseUrl}/doubt.png` },
  { id: 'feelgood', code: ':feelgood:', name: 'Feel Good', url: `${baseUrl}/feelgood.png` },
  { id: 'funny', code: ':funny:', name: 'Funny', url: `${baseUrl}/funny.png` },
  { id: 'good', code: ':good:', name: 'Good', url: `${baseUrl}/good.png` },
  { id: 'happy', code: ':happy:', name: 'Happy', url: `${baseUrl}/happy.png` },
  { id: 'happy3', code: ':happy3:', name: 'Happy 3', url: `${baseUrl}/happy3.png` },
  { id: 'hee', code: ':hee:', name: 'Hee', url: `${baseUrl}/hee.png` },
  { id: 'heu', code: ':heu:', name: 'Heu', url: `${baseUrl}/heu.png` },
  { id: 'hilarous', code: ':hilarous:', name: 'Hilarous', url: `${baseUrl}/hilarous.png` },
  { id: 'hmm', code: ':hmm:', name: 'Hmm', url: `${baseUrl}/hmm.png` },
  { id: 'hono', code: ':hono:', name: 'Hono', url: `${baseUrl}/hono.png` },
  { id: 'hoo', code: ':hoo:', name: 'Hoo', url: `${baseUrl}/hoo.png` },
  { id: 'hooo', code: ':hooo:', name: 'Hooo', url: `${baseUrl}/hooo.png` },
  { id: 'idontcare', code: ':idontcare:', name: "I don't care", url: `${baseUrl}/idontcare.png` },
  { id: 'indiferent', code: ':indiferent:', name: 'Indiferent', url: `${baseUrl}/indiferent.png` },
  { id: 'kiss', code: ':kiss:', name: 'Kiss', url: `${baseUrl}/kiss.png` },
  { id: 'kiss2', code: ':kiss2:', name: 'Kiss 2', url: `${baseUrl}/kiss2.png` },
  { id: 'kiss3', code: ':kiss3:', name: 'Kiss 3', url: `${baseUrl}/kiss3.png` },
  { id: 'kiss4', code: ':kiss4:', name: 'Kiss 4', url: `${baseUrl}/kiss4.png` },
  { id: 'med', code: ':med:', name: 'Med', url: `${baseUrl}/med.png` },
  { id: 'medsmile', code: ':medsmile:', name: 'Med Smile', url: `${baseUrl}/medsmile.png` },
  { id: 'muted', code: ':muted:', name: 'Muted', url: `${baseUrl}/muted.png` },
  { id: 'nana', code: ':nana:', name: 'Nana', url: `${baseUrl}/nana.png` },
  { id: 'neutral', code: ':neutral:', name: 'Neutral', url: `${baseUrl}/neutral.png` },
  { id: 'noooo', code: ':noooo:', name: 'Noooo', url: `${baseUrl}/noooo.png` },
  { id: 'nosebleed', code: ':nosebleed:', name: 'Nosebleed', url: `${baseUrl}/nosebleed.png` },
  { id: 'omg', code: ':omg:', name: 'OMG', url: `${baseUrl}/omg.png` },
  { id: 'omgomg', code: ':omgomg:', name: 'OMG OMG', url: `${baseUrl}/omgomg.png` },
  { id: 'pokerface', code: ':pokerface:', name: 'Poker Face', url: `${baseUrl}/pokerface.png` },
  { id: 'reverse', code: ':reverse:', name: 'Reverse', url: `${baseUrl}/reverse.png` },
  { id: 'sad', code: ':sad:', name: 'Sad', url: `${baseUrl}/sad.png` },
  { id: 'sad2', code: ':sad2:', name: 'Sad 2', url: `${baseUrl}/sad2.png` },
  { id: 'scared', code: ':scared:', name: 'Scared', url: `${baseUrl}/scared.png` },
  { id: 'sick2', code: ':sick2:', name: 'Sick 2', url: `${baseUrl}/sick2.png` },
  { id: 'sleep', code: ':sleep:', name: 'Sleep', url: `${baseUrl}/sleep.png` },
  { id: 'smile', code: ':smile:', name: 'Smile', url: `${baseUrl}/smile.png` },
  { id: 'smileface', code: ':smileface:', name: 'Smile Face', url: `${baseUrl}/smileface.png` },
  { id: 'smileteeth', code: ':smileteeth:', name: 'Smile Teeth', url: `${baseUrl}/smileteeth.png` },
  { id: 'sweat', code: ':sweat:', name: 'Sweat', url: `${baseUrl}/sweat.png` },
  { id: 'tongue', code: ':tongue:', name: 'Tongue', url: `${baseUrl}/tongue.png` },
  { id: 'tongue2', code: ':tongue2:', name: 'Tongue 2', url: `${baseUrl}/tongue2.png` },
  { id: 'tongue3', code: ':tongue3:', name: 'Tongue 3', url: `${baseUrl}/tongue3.png` },
  { id: 'toro', code: ':toro:', name: 'Toro', url: `${baseUrl}/toro.png` },
  { id: 'totalangry', code: ':totalangry:', name: 'Total Angry', url: `${baseUrl}/totalangry.png` },
  { id: 'totallove', code: ':totallove:', name: 'Total Love', url: `${baseUrl}/totallove.png` },
  { id: 'verysad', code: ':verysad:', name: 'Very Sad', url: `${baseUrl}/verysad.png` },
  { id: 'whaaa', code: ':whaaa:', name: 'Whaaa', url: `${baseUrl}/whaaa.png` },
  { id: 'whocare', code: ':whocare:', name: 'Who Care', url: `${baseUrl}/whocare.png` },
  { id: 'wot', code: ':wot:', name: 'Wot', url: `${baseUrl}/wot.png` },
];

// Placeholder categories (can be extended later if needed)
const food: ArabicChatEmojiItem[] = [];
const stickers: ArabicChatEmojiItem[] = [];

export const arabicChatEmojis: ArabicChatEmojiCatalog = {
  base,
  food,
  stickers,
};

export default arabicChatEmojis;
