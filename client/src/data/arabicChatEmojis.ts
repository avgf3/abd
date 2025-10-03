export interface ArabicChatEmojiItem {
  id: string; // unique id (usually same as code without colons)
  code: string; // :amazing:
  name?: string; // optional display name
  url: string; // absolute URL to the png/gif
}

export interface ArabicChatEmojiCatalog {
  base: ArabicChatEmojiItem[];
  anim1: ArabicChatEmojiItem[]; // Animated page 1 (local GIFs)
  anim2: ArabicChatEmojiItem[]; // Animated page 2 (local GIFs)
  anim3: ArabicChatEmojiItem[]; // Animated page 3 (local GIFs)
}

// Use local assets only (no external links)
const baseUrl = '/assets/arabic-emoji';

// Core set extracted from arabic.chat room picker
const base: ArabicChatEmojiItem[] = [
  { id: 'amazing', code: ':amazing:', name: 'Amazing', url: `${baseUrl}/base/amazing.png` },
  { id: 'angel', code: ':angel:', name: 'Angel', url: `${baseUrl}/base/angel.png` },
  { id: 'angry', code: ':angry:', name: 'Angry', url: `${baseUrl}/base/angry.png` },
  { id: 'anxious', code: ':anxious:', name: 'Anxious', url: `${baseUrl}/base/anxious.png` },
  { id: 'bad', code: ':bad:', name: 'Bad', url: `${baseUrl}/base/bad.png` },
  { id: 'bigsmile', code: ':bigsmile:', name: 'Big Smile', url: `${baseUrl}/base/bigsmile.png` },
  { id: 'blink', code: ':blink:', name: 'Blink', url: `${baseUrl}/base/blink.png` },
  { id: 'cool', code: ':cool:', name: 'Cool', url: `${baseUrl}/base/cool.png` },
  { id: 'crisped', code: ':crisped:', name: 'Crisped', url: `${baseUrl}/base/crisped.png` },
  { id: 'cry', code: ':cry:', name: 'Cry', url: `${baseUrl}/base/cry.png` },
  { id: 'cry2', code: ':cry2:', name: 'Cry 2', url: `${baseUrl}/base/cry2.png` },
  { id: 'dead', code: ':dead:', name: 'Dead', url: `${baseUrl}/base/dead.png` },
  { id: 'desperate', code: ':desperate:', name: 'Desperate', url: `${baseUrl}/base/desperate.png` },
  { id: 'devil', code: ':devil:', name: 'Devil', url: `${baseUrl}/base/devil.png` },
  { id: 'doubt', code: ':doubt:', name: 'Doubt', url: `${baseUrl}/base/doubt.png` },
  { id: 'feelgood', code: ':feelgood:', name: 'Feel Good', url: `${baseUrl}/base/feelgood.png` },
  { id: 'funny', code: ':funny:', name: 'Funny', url: `${baseUrl}/base/funny.png` },
  { id: 'good', code: ':good:', name: 'Good', url: `${baseUrl}/base/good.png` },
  { id: 'happy', code: ':happy:', name: 'Happy', url: `${baseUrl}/base/happy.png` },
  { id: 'happy3', code: ':happy3:', name: 'Happy 3', url: `${baseUrl}/base/happy3.png` },
  { id: 'hee', code: ':hee:', name: 'Hee', url: `${baseUrl}/base/hee.png` },
  { id: 'heu', code: ':heu:', name: 'Heu', url: `${baseUrl}/base/heu.png` },
  { id: 'hilarous', code: ':hilarous:', name: 'Hilarous', url: `${baseUrl}/base/hilarous.png` },
  { id: 'hmm', code: ':hmm:', name: 'Hmm', url: `${baseUrl}/base/hmm.png` },
  { id: 'hono', code: ':hono:', name: 'Hono', url: `${baseUrl}/base/hono.png` },
  { id: 'hoo', code: ':hoo:', name: 'Hoo', url: `${baseUrl}/base/hoo.png` },
  { id: 'hooo', code: ':hooo:', name: 'Hooo', url: `${baseUrl}/base/hooo.png` },
  { id: 'idontcare', code: ':idontcare:', name: "I don't care", url: `${baseUrl}/base/idontcare.png` },
  { id: 'indiferent', code: ':indiferent:', name: 'Indiferent', url: `${baseUrl}/base/indiferent.png` },
  { id: 'kiss', code: ':kiss:', name: 'Kiss', url: `${baseUrl}/base/kiss.png` },
  { id: 'kiss2', code: ':kiss2:', name: 'Kiss 2', url: `${baseUrl}/base/kiss2.png` },
  { id: 'kiss3', code: ':kiss3:', name: 'Kiss 3', url: `${baseUrl}/base/kiss3.png` },
  { id: 'kiss4', code: ':kiss4:', name: 'Kiss 4', url: `${baseUrl}/base/kiss4.png` },
  { id: 'med', code: ':med:', name: 'Med', url: `${baseUrl}/base/med.png` },
  { id: 'medsmile', code: ':medsmile:', name: 'Med Smile', url: `${baseUrl}/base/medsmile.png` },
  { id: 'muted', code: ':muted:', name: 'Muted', url: `${baseUrl}/base/muted.png` },
  { id: 'nana', code: ':nana:', name: 'Nana', url: `${baseUrl}/base/nana.png` },
  { id: 'neutral', code: ':neutral:', name: 'Neutral', url: `${baseUrl}/base/neutral.png` },
  { id: 'noooo', code: ':noooo:', name: 'Noooo', url: `${baseUrl}/base/noooo.png` },
  { id: 'nosebleed', code: ':nosebleed:', name: 'Nosebleed', url: `${baseUrl}/base/nosebleed.png` },
  { id: 'omg', code: ':omg:', name: 'OMG', url: `${baseUrl}/base/omg.png` },
  { id: 'omgomg', code: ':omgomg:', name: 'OMG OMG', url: `${baseUrl}/base/omgomg.png` },
  { id: 'pokerface', code: ':pokerface:', name: 'Poker Face', url: `${baseUrl}/base/pokerface.png` },
  { id: 'reverse', code: ':reverse:', name: 'Reverse', url: `${baseUrl}/base/reverse.png` },
  { id: 'sad', code: ':sad:', name: 'Sad', url: `${baseUrl}/base/sad.png` },
  { id: 'sad2', code: ':sad2:', name: 'Sad 2', url: `${baseUrl}/base/sad2.png` },
  { id: 'scared', code: ':scared:', name: 'Scared', url: `${baseUrl}/base/scared.png` },
  { id: 'sick2', code: ':sick2:', name: 'Sick 2', url: `${baseUrl}/base/sick2.png` },
  { id: 'sleep', code: ':sleep:', name: 'Sleep', url: `${baseUrl}/base/sleep.png` },
  { id: 'smile', code: ':smile:', name: 'Smile', url: `${baseUrl}/base/smile.png` },
  { id: 'smileface', code: ':smileface:', name: 'Smile Face', url: `${baseUrl}/base/smileface.png` },
  { id: 'smileteeth', code: ':smileteeth:', name: 'Smile Teeth', url: `${baseUrl}/base/smileteeth.png` },
  { id: 'sweat', code: ':sweat:', name: 'Sweat', url: `${baseUrl}/base/sweat.png` },
  { id: 'tongue', code: ':tongue:', name: 'Tongue', url: `${baseUrl}/base/tongue.png` },
  { id: 'tongue2', code: ':tongue2:', name: 'Tongue 2', url: `${baseUrl}/base/tongue2.png` },
  { id: 'tongue3', code: ':tongue3:', name: 'Tongue 3', url: `${baseUrl}/base/tongue3.png` },
  { id: 'toro', code: ':toro:', name: 'Toro', url: `${baseUrl}/base/toro.png` },
  { id: 'totalangry', code: ':totalangry:', name: 'Total Angry', url: `${baseUrl}/base/totalangry.png` },
  { id: 'totallove', code: ':totallove:', name: 'Total Love', url: `${baseUrl}/base/totallove.png` },
  { id: 'verysad', code: ':verysad:', name: 'Very Sad', url: `${baseUrl}/base/verysad.png` },
  { id: 'whaaa', code: ':whaaa:', name: 'Whaaa', url: `${baseUrl}/base/whaaa.png` },
  { id: 'whocare', code: ':whocare:', name: 'Who Care', url: `${baseUrl}/base/whocare.png` },
  { id: 'wot', code: ':wot:', name: 'Wot', url: `${baseUrl}/base/wot.png` },
];
// Animated pages (fill with local GIFs placed under /assets/arabic-emoji/anim1|2|3)
const anim1: ArabicChatEmojiItem[] = [
  { id: 'grrepi', code: ':grrepi:', name: 'grrepi', url: `${baseUrl}/anim1/grrepi.gif` },
  { id: 'hehe', code: ':hehe:', name: 'hehe', url: `${baseUrl}/anim1/hehe.gif` },
];
const anim2: ArabicChatEmojiItem[] = [
  // Add more local GIFs as needed
];
const anim3: ArabicChatEmojiItem[] = [
  // Add more local GIFs as needed
];

export const arabicChatEmojis: ArabicChatEmojiCatalog = {
  base,
  anim1,
  anim2,
  anim3,
};

export default arabicChatEmojis;
