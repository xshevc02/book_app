import "@fontsource/inter/400.css";
import "@fontsource/pinyon-script/400.css";
import "framework7/css/bundle";
import "./styles.css";
import {
  getAuthSession,
  isSupabaseConfigured,
  loadPublicPosts,
  loadUserState,
  onAuthChange,
  savePublicPost,
  saveUserState,
  signInWithGoogle,
  signOut
} from "./supabaseClient.js";

const APP_BASE = import.meta.env.BASE_URL || "/";
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || "";
const STORAGE_KEY = "book-nook-local-db-v1";

function assetUrl(path) {
  return `${APP_BASE}${path.replace(/^\/+/, "")}`;
}

const state = {
  tab: "home",
  theme: localStorage.getItem("book-nook-theme") || "autumn",
  composing: false,
  addingBook: false,
  addBookQuery: "",
  remoteBookResults: [],
  remoteBookStatus: "idle",
  openLibraryTrendingBooks: [],
  openLibraryTrendingStatus: "idle",
  composeBookQuery: "",
  composeBookResults: [],
  composeBookStatus: "idle",
  composeBookSelected: false,
  openStatusMenu: "",
  openStatusMenuDirection: "down",
  feedQuery: "",
  feedSearchText: "",
  feedFilter: "all",
  detailPage: null,
  bookDetailTab: "description",
  expandedPosts: new Set(),
  userPosts: [],
  liked: new Set(["post-1"]),
  saved: new Set(["post-2"]),
  remotePosts: [],
  authStatus: isSupabaseConfigured ? "loading" : "local",
  authUser: null,
  syncStatus: "local",
  cloudStateReady: false,
  currentReadingIndex: 0,
  shelfMode: "reading",
  currentShelf: "all",
  currentCustomShelf: null,
  creatingShelf: false,
  readingCalendarMonth: monthIsoFromDate(new Date()),
  feedbackPromptBook: "",
  feedbackPromptPrevious: null,
  editingFeedbackBook: "",
  removeBookPrompt: "",
  openFinishedDatePicker: "",
  finishedDatePickerMonth: "",
  calendarDemoSeeded: false,
  contentScrollTop: 0,
  manualBookPage: false
};

let books = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    cover: assetUrl("covers/pride-and-prejudice.jpg"),
    isbn: "9780141439518",
    status: "Reading",
    totalPages: 432,
    readPages: 276,
    progress: 64,
    note: "A sharp, charming reread for slow evenings.",
    description: "Elizabeth Bennet meets pride, money, family pressure, bad first impressions, and one very inconvenient Mr. Darcy. A social comedy that stays bright because its romance is also an argument about judgment."
  },
  {
    title: "Frankenstein",
    author: "Mary Shelley",
    cover: assetUrl("covers/frankenstein.jpg"),
    isbn: "9780141439471",
    status: "Wishlist",
    totalPages: 280,
    readPages: 0,
    progress: 0,
    note: "Saved for a darker, rainier weekend.",
    description: "Victor Frankenstein creates life and then cannot bear the responsibility of what he has made. The novel is eerie and philosophical, but also deeply sad about loneliness, rejection, and the need to be seen."
  },
  {
    title: "Little Women",
    author: "Louisa May Alcott",
    cover: assetUrl("covers/little-women.jpg"),
    isbn: "9780147514011",
    status: "Finished",
    totalPages: 759,
    readPages: 759,
    progress: 100,
    myRating: "4.5",
    myFeedback: "Tender and warm without feeling too neat.",
    note: "Warm, tender, and still very alive.",
    description: "The March sisters move through money worries, ambition, love, disappointment, and the ordinary work of growing up. It is a family story with a lot of warmth, but it keeps enough ache and stubbornness to feel alive."
  },
  {
    title: "Jane Eyre",
    author: "Charlotte Bronte",
    cover: assetUrl("covers/jane-eyre.jpg"),
    isbn: "9780141441146",
    status: "Finished",
    totalPages: 532,
    readPages: 532,
    progress: 100,
    note: "Gothic, stubborn, and beautifully intense.",
    description: "Jane Eyre follows a sharp, lonely heroine from a harsh childhood into work, love, and a difficult claim to independence. It is gothic, romantic, morally intense, and built around a voice that refuses to be made small."
  }
];

const defaultBooks = cloneBooks(books);

const posts = [
  {
    id: "post-1",
    user: "Anya",
    handle: "@reading.window",
    avatar: "A",
    avatarImage: assetUrl("avatars/anya.jpg"),
    mood: "morning coffee",
    image: "linear-gradient(135deg, #9fd7ef 0%, #fff1a8 48%, #8bbf5e 100%)",
    book: "Pride and Prejudice",
    cover: assetUrl("covers/pride-and-prejudice.jpg"),
    text: "Took Elizabeth Bennet to a tiny coffee place and forgot to check my phone for an hour.",
    likes: 128,
    comments: 14
  },
  {
    id: "post-2",
    user: "Mila Books",
    handle: "@mila.shelves",
    avatar: "M",
    avatarImage: assetUrl("avatars/mila.jpg"),
    mood: "beach chapter",
    image: "linear-gradient(135deg, #b8e4ff 0%, #f9d566 45%, #c88943 100%)",
    book: "Little Women",
    cover: assetUrl("covers/little-women.jpg"),
    text: "Still the perfect book for soft light, family drama, and pretending you only meant to read one chapter.",
    likes: 402,
    comments: 33
  },
  {
    id: "post-3",
    user: "Lera",
    handle: "@after.chapter",
    avatar: "L",
    avatarImage: assetUrl("avatars/lera.jpg"),
    mood: "after rain",
    image: "linear-gradient(135deg, #dff5ff 0%, #94c86c 46%, #ffe27a 100%)",
    book: "Jane Eyre",
    cover: assetUrl("covers/jane-eyre.jpg"),
    text: "The rain outside made this feel twice as dramatic, which is exactly how it should be.",
    likes: 89,
    comments: 8
  }
];

const shelves = {
  all: { label: "All", status: null },
  reading: { label: "Reading", status: "Reading" },
  wishlist: { label: "Wishlist", status: "Wishlist" },
  finished: { label: "Finished", status: "Finished" }
};

const readingStatuses = ["Wishlist", "Reading", "Finished"];

const awardPicks = [
  {
    title: "The Goldfinch",
    author: "Donna Tartt",
    cover: "https://covers.openlibrary.org/b/isbn/9780316055444-M.jpg",
    isbn: "9780316055444",
    status: "",
    totalPages: 771,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "A Pulitzer Prize-winning novel about loss, obsession, art, and the strange objects that anchor a life.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "Shuggie Bain",
    author: "Douglas Stuart",
    cover: "https://covers.openlibrary.org/b/isbn/9780802148049-M.jpg",
    isbn: "9780802148049",
    status: "",
    totalPages: 448,
    readPages: 0,
    progress: 0,
    communityRating: "4.3",
    description: "A Booker Prize-winning novel about childhood, addiction, tenderness, and survival in working-class Glasgow.",
    note: "Booker Prize winner."
  },
  {
    title: "The Fifth Season",
    author: "N. K. Jemisin",
    cover: "https://covers.openlibrary.org/b/isbn/9780316229296-M.jpg",
    isbn: "9780316229296",
    status: "",
    totalPages: 512,
    readPages: 0,
    progress: 0,
    communityRating: "4.4",
    description: "A Hugo Award-winning fantasy about catastrophe, power, motherhood, and a world always close to breaking.",
    note: "Hugo Award winner."
  },
  {
    title: "Hamnet",
    author: "Maggie O'Farrell",
    cover: "https://covers.openlibrary.org/b/isbn/9780525657606-M.jpg",
    isbn: "9780525657606",
    status: "",
    totalPages: 320,
    readPages: 0,
    progress: 0,
    communityRating: "4.2",
    description: "A Women’s Prize-winning novel imagining grief, marriage, and art around Shakespeare’s family.",
    note: "Women’s Prize winner."
  },
  {
    title: "Lincoln in the Bardo",
    author: "George Saunders",
    cover: "https://covers.openlibrary.org/b/isbn/9780812995343-M.jpg",
    isbn: "9780812995343",
    status: "",
    totalPages: 368,
    readPages: 0,
    progress: 0,
    communityRating: "3.8",
    description: "A Booker Prize-winning ghost chorus about grief, history, and a father trying to let go.",
    note: "Booker Prize winner."
  },
  {
    title: "Beloved",
    author: "Toni Morrison",
    cover: "https://covers.openlibrary.org/b/isbn/9781400033416-M.jpg",
    isbn: "9781400033416",
    status: "",
    totalPages: 324,
    readPages: 0,
    progress: 0,
    communityRating: "4.1",
    description: "A Pulitzer Prize-winning novel about memory, haunting, motherhood, and the afterlife of slavery.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "Station Eleven",
    author: "Emily St. John Mandel",
    cover: "https://covers.openlibrary.org/b/isbn/9780385353304-M.jpg",
    isbn: "9780385353304",
    status: "",
    totalPages: 352,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "An Arthur C. Clarke Award-winning novel about art, survival, and the fragile rituals of civilization.",
    note: "Arthur C. Clarke Award winner."
  },
  {
    title: "The Underground Railroad",
    author: "Colson Whitehead",
    cover: "https://covers.openlibrary.org/b/isbn/9780385542364-M.jpg",
    isbn: "9780385542364",
    status: "",
    totalPages: 320,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "A Pulitzer Prize-winning novel that turns escape from slavery into an alternate American mythology.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "Wolf Hall",
    author: "Hilary Mantel",
    cover: "https://covers.openlibrary.org/b/isbn/9780312429980-M.jpg",
    isbn: "9780312429980",
    status: "",
    totalPages: 672,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "A Booker Prize-winning historical novel about power, intelligence, and Thomas Cromwell's rise.",
    note: "Booker Prize winner."
  },
  {
    title: "The Luminaries",
    author: "Eleanor Catton",
    cover: "https://covers.openlibrary.org/b/isbn/9780316074315-M.jpg",
    isbn: "9780316074315",
    status: "",
    totalPages: 848,
    readPages: 0,
    progress: 0,
    communityRating: "3.8",
    description: "A Booker Prize-winning literary mystery built around goldfields, secrets, and celestial patterns.",
    note: "Booker Prize winner."
  },
  {
    title: "A Visit from the Goon Squad",
    author: "Jennifer Egan",
    cover: "https://covers.openlibrary.org/b/isbn/9780307477477-M.jpg",
    isbn: "9780307477477",
    status: "",
    totalPages: 352,
    readPages: 0,
    progress: 0,
    communityRating: "3.7",
    description: "A Pulitzer Prize-winning mosaic about music, time, fame, and the people we almost become.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "The Overstory",
    author: "Richard Powers",
    cover: "https://covers.openlibrary.org/b/isbn/9780393356687-M.jpg",
    isbn: "9780393356687",
    status: "",
    totalPages: 512,
    readPages: 0,
    progress: 0,
    communityRating: "4.2",
    description: "A Pulitzer Prize-winning novel about trees, activism, interconnection, and lives branching together.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "Less",
    author: "Andrew Sean Greer",
    cover: "https://covers.openlibrary.org/b/isbn/9780316316125-M.jpg",
    isbn: "9780316316125",
    status: "",
    totalPages: 272,
    readPages: 0,
    progress: 0,
    communityRating: "3.7",
    description: "A Pulitzer Prize-winning comic novel about travel, embarrassment, love, and second chances.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "The Road",
    author: "Cormac McCarthy",
    cover: "https://covers.openlibrary.org/b/isbn/9780307387899-M.jpg",
    isbn: "9780307387899",
    status: "",
    totalPages: 287,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "A Pulitzer Prize-winning post-apocalyptic novel about a father, a son, and carrying the fire.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "Middlesex",
    author: "Jeffrey Eugenides",
    cover: "https://covers.openlibrary.org/b/isbn/9780312427733-M.jpg",
    isbn: "9780312427733",
    status: "",
    totalPages: 544,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "A Pulitzer Prize-winning family saga about migration, inheritance, identity, and transformation.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "A Brief History of Seven Killings",
    author: "Marlon James",
    cover: "https://covers.openlibrary.org/b/isbn/9781594486005-M.jpg",
    isbn: "9781594486005",
    status: "",
    totalPages: 704,
    readPages: 0,
    progress: 0,
    communityRating: "3.9",
    description: "A Booker Prize-winning polyphonic novel moving through politics, violence, music, and myth.",
    note: "Booker Prize winner."
  },
  {
    title: "The Sellout",
    author: "Paul Beatty",
    cover: "https://covers.openlibrary.org/b/isbn/9781250083258-M.jpg",
    isbn: "9781250083258",
    status: "",
    totalPages: 304,
    readPages: 0,
    progress: 0,
    communityRating: "3.7",
    description: "A Booker Prize-winning satire about race, America, language, and the absurdity of power.",
    note: "Booker Prize winner."
  },
  {
    title: "Gilead",
    author: "Marilynne Robinson",
    cover: "https://covers.openlibrary.org/b/isbn/9780312424404-M.jpg",
    isbn: "9780312424404",
    status: "",
    totalPages: 247,
    readPages: 0,
    progress: 0,
    communityRating: "4.0",
    description: "A Pulitzer Prize-winning novel in the form of a minister's letter to his young son.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "The Nickel Boys",
    author: "Colson Whitehead",
    cover: "https://covers.openlibrary.org/b/isbn/9780345804341-M.jpg",
    isbn: "9780345804341",
    status: "",
    totalPages: 224,
    readPages: 0,
    progress: 0,
    communityRating: "4.2",
    description: "A Pulitzer Prize-winning novel about institutional abuse, friendship, and buried American history.",
    note: "Pulitzer Prize winner."
  },
  {
    title: "Piranesi",
    author: "Susanna Clarke",
    cover: "https://covers.openlibrary.org/b/isbn/9781635575637-M.jpg",
    isbn: "9781635575637",
    status: "",
    totalPages: 272,
    readPages: 0,
    progress: 0,
    communityRating: "4.3",
    description: "A Women's Prize-winning fantasy about a labyrinthine house, solitude, devotion, and mystery.",
    note: "Women’s Prize winner."
  }
];

const trendingFallbackPicks = [
  {
    title: "The Secret History",
    author: "Donna Tartt",
    cover: "https://covers.openlibrary.org/b/isbn/9781400031702-M.jpg",
    isbn: "9781400031702",
    status: "",
    totalPages: 559,
    readPages: 0,
    progress: 0,
    communityRating: "4.2",
    description: "A dark academic novel about beauty, obsession, friendship, and the consequences of trying to live inside an idea.",
    note: "Saved discovery pick."
  },
  {
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    cover: "https://covers.openlibrary.org/b/isbn/9780593321201-M.jpg",
    isbn: "9780593321201",
    status: "",
    totalPages: 416,
    readPages: 0,
    progress: 0,
    communityRating: "4.2",
    description: "A novel about creative partnership, games, friendship, ambition, and the many lives people build together.",
    note: "Saved discovery pick."
  },
  {
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    cover: "https://covers.openlibrary.org/b/isbn/9781501161933-M.jpg",
    isbn: "9781501161933",
    status: "",
    totalPages: 400,
    readPages: 0,
    progress: 0,
    communityRating: "4.4",
    description: "An old Hollywood story about fame, desire, image, truth, and the costs of becoming unforgettable.",
    note: "Saved discovery pick."
  },
  {
    title: "Lessons in Chemistry",
    author: "Bonnie Garmus",
    cover: "https://covers.openlibrary.org/b/isbn/9780385547345-M.jpg",
    isbn: "9780385547345",
    status: "",
    totalPages: 400,
    readPages: 0,
    progress: 0,
    communityRating: "4.3",
    description: "A witty novel about science, ambition, sexism, cooking, and refusing to shrink yourself for the room.",
    note: "Saved discovery pick."
  },
  {
    title: "Babel",
    author: "R. F. Kuang",
    cover: "https://covers.openlibrary.org/b/isbn/9780063021426-M.jpg",
    isbn: "9780063021426",
    status: "",
    totalPages: 560,
    readPages: 0,
    progress: 0,
    communityRating: "4.2",
    description: "A fantasy of translation, empire, scholarship, language, and rebellion inside a glittering academic machine.",
    note: "Saved discovery pick."
  },
  {
    title: "Normal People",
    author: "Sally Rooney",
    cover: "https://covers.openlibrary.org/b/isbn/9781984822185-M.jpg",
    isbn: "9781984822185",
    status: "",
    totalPages: 273,
    readPages: 0,
    progress: 0,
    communityRating: "3.8",
    description: "A spare, intimate novel about class, love, timing, and the private weather between two people.",
    note: "Saved discovery pick."
  },
  {
    title: "Demon Copperhead",
    author: "Barbara Kingsolver",
    cover: "https://covers.openlibrary.org/b/isbn/9780063251922-M.jpg",
    isbn: "9780063251922",
    status: "",
    totalPages: 560,
    readPages: 0,
    progress: 0,
    communityRating: "4.5",
    description: "A modern Appalachian David Copperfield about poverty, foster care, addiction, voice, and endurance.",
    note: "Saved discovery pick."
  },
  {
    title: "Yellowface",
    author: "R. F. Kuang",
    cover: "https://covers.openlibrary.org/b/isbn/9780063250833-M.jpg",
    isbn: "9780063250833",
    status: "",
    totalPages: 336,
    readPages: 0,
    progress: 0,
    communityRating: "3.8",
    description: "A sharp publishing-world satire about authorship, theft, race, ambition, and online spectacle.",
    note: "Saved discovery pick."
  },
  {
    title: "The Song of Achilles",
    author: "Madeline Miller",
    cover: "https://covers.openlibrary.org/b/isbn/9780062060624-M.jpg",
    isbn: "9780062060624",
    status: "",
    totalPages: 378,
    readPages: 0,
    progress: 0,
    communityRating: "4.3",
    description: "A lyrical retelling of Achilles and Patroclus, full of tenderness, war, fate, and mythic heartbreak.",
    note: "Saved discovery pick."
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    cover: "https://covers.openlibrary.org/b/isbn/9780593135204-M.jpg",
    isbn: "9780593135204",
    status: "",
    totalPages: 496,
    readPages: 0,
    progress: 0,
    communityRating: "4.5",
    description: "A science-forward space survival story about memory, problem-solving, friendship, and saving more than yourself.",
    note: "Saved discovery pick."
  }
];

let customShelves = [
  {
    id: "rainy-days",
    name: "Rainy day reads",
    description: "For dramatic windows, tea, and weather doing its thing.",
    bookTitles: ["Jane Eyre", "Frankenstein"]
  },
  {
    id: "soft-weekend",
    name: "Soft weekend",
    description: "Quiet classics for slow mornings.",
    bookTitles: ["Little Women", "Pride and Prejudice"]
  }
];

loadLocalData();

function loadLocalData() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      seedCalendarDemoProgress();
      return;
    }

    const data = JSON.parse(rawData);
    if (data.theme) state.theme = data.theme;
    if (Array.isArray(data.books)) books = normalizeStoredBooks(mergeStoredBooks(data.books, defaultBooks));
    if (Array.isArray(data.customShelves)) customShelves = data.customShelves;
    if (Array.isArray(data.userPosts)) state.userPosts = data.userPosts;
    if (Array.isArray(data.liked)) state.liked = new Set(data.liked);
    if (Array.isArray(data.saved)) state.saved = new Set(data.saved);
    state.calendarDemoSeeded = Boolean(data.calendarDemoSeeded);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  seedCalendarDemoProgress();
}

function mergeStoredBooks(storedBooks, baseBooks = books) {
  const storedByTitle = new Map(
    storedBooks
      .filter((book) => book?.title)
      .map((book) => [book.title.toLowerCase(), book])
  );
  const merged = cloneBooks(baseBooks).map((book) => {
    const stored = storedByTitle.get(book.title.toLowerCase());
    if (!stored) return book;
    storedByTitle.delete(book.title.toLowerCase());
    return { ...book, ...stored };
  });

  return [
    ...merged,
    ...storedByTitle.values()
  ];
}

function cloneBooks(bookList) {
  return bookList.map((book) => ({
    ...book,
    readingDates: Array.isArray(book.readingDates) ? [...book.readingDates] : book.readingDates,
    subjects: Array.isArray(book.subjects) ? [...book.subjects] : book.subjects
  }));
}

function normalizeStoredBooks(bookList) {
  return bookList.map((book) => {
    book.cover = normalizeAssetUrl(book.cover);
    book.note = cleanImportedNote(book.note);
    if (book.status !== "Finished") {
      book.finishedAt = "";
    }
    if (book.status !== "Reading" && book.status !== "Finished") {
      book.startedAt = "";
    }
    return book;
  });
}

function normalizeAssetUrl(value) {
  const path = `${value || ""}`;
  if (!path.startsWith("/covers/") && !path.startsWith("/avatars/") && !path.startsWith("/icons/")) return value;
  return assetUrl(path);
}

function cleanImportedNote(note) {
  const text = `${note || ""}`.trim();
  if (/^First published in \d{3,4}\.?$/i.test(text)) return "";
  if (text === "Imported from the book database.") return "";
  return text;
}

function displayBookNote(book) {
  return cleanImportedNote(book.note);
}

function seedCalendarDemoProgress() {
  if (state.calendarDemoSeeded) return;
  const book = books.find((item) => item.title === "Frankenstein");
  if (!book) return;
  Object.assign(book, {
    status: "Finished",
    readingFormat: "paper",
    totalPages: book.totalPages || 280,
    readPages: book.totalPages || 280,
    progress: 100,
    startedAt: "2026-08-10",
    finishedAt: "2026-08-22",
    readingDates: [
      "2026-08-10",
      "2026-08-12",
      "2026-08-14",
      "2026-08-16",
      "2026-08-18",
      "2026-08-20",
      "2026-08-22"
    ],
    myRating: book.myRating || "4.5"
  });
  state.calendarDemoSeeded = true;
}

function persistLocalData(options = {}) {
  try {
    books = normalizeStoredBooks(books);
    const payload = userStatePayload();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      theme: state.theme,
      ...payload,
      userPosts: state.userPosts,
    }));
    if (options.remote !== false) scheduleRemoteSync();
  } catch {
    // Local storage can fail in private browsing or if image data grows too large.
  }
}

function userStatePayload() {
  return {
    theme: state.theme,
    calendarDemoSeeded: state.calendarDemoSeeded,
    books,
    customShelves,
    liked: [...state.liked],
    saved: [...state.saved]
  };
}

function applyUserStatePayload(payload) {
  if (!payload) return;
  if (payload.theme === "autumn" || payload.theme === "summer") state.theme = payload.theme;
  if (Array.isArray(payload.books)) books = normalizeStoredBooks(mergeStoredBooks(payload.books, defaultBooks));
  if (Array.isArray(payload.customShelves)) customShelves = payload.customShelves;
  if (Array.isArray(payload.liked)) state.liked = new Set(payload.liked);
  if (Array.isArray(payload.saved)) state.saved = new Set(payload.saved);
  state.calendarDemoSeeded = Boolean(payload.calendarDemoSeeded);
}

function scheduleRemoteSync() {
  if (!state.authUser || !isSupabaseConfigured || !state.cloudStateReady) return;
  window.clearTimeout(remoteSyncTimer);
  state.syncStatus = "saving";
  remoteSyncTimer = window.setTimeout(async () => {
    try {
      await saveUserState(state.authUser.id, userStatePayload());
      state.syncStatus = "synced";
    } catch {
      state.syncStatus = "error";
    }
  }, 700);
}

async function bootstrapBackend() {
  if (!isSupabaseConfigured) {
    state.authStatus = "local";
    return;
  }

  try {
    const session = await getAuthSession();
    clearAuthHashFromUrl();
    await applySession(session, { migrateLocal: true });
    unsubscribeAuth = onAuthChange((nextSession) => {
      clearAuthHashFromUrl();
      applySession(nextSession, { migrateLocal: true });
    });
  } catch {
    clearAuthHashFromUrl();
    state.authStatus = "error";
    render({ preserveScroll: true });
  }
}

function clearAuthHashFromUrl() {
  if (!window.location.hash.includes("access_token=") && !window.location.hash.includes("refresh_token=")) return;
  window.history.replaceState(window.history.state, document.title, `${window.location.pathname}${window.location.search}`);
}

function removeLegacyPwaCache() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations
          .filter((registration) => registration.scope.includes(APP_BASE))
          .forEach((registration) => registration.unregister());
      })
      .catch(() => {});
  }

  if ("caches" in window) {
    const cacheNameLooksOurs = (key) => /pockland|book[_-]?app|workbox|precache|vite/i.test(key);
    caches.keys()
      .then((keys) => keys
        .filter(cacheNameLooksOurs)
        .forEach((key) => caches.delete(key)))
      .catch(() => {});
  }
}

async function applySession(session, options = {}) {
  state.authUser = session?.user || null;
  state.authStatus = state.authUser ? "signed-in" : "signed-out";

  if (!state.authUser) {
    state.cloudStateReady = false;
    state.remotePosts = [];
    state.syncStatus = "local";
    render({ preserveScroll: true });
    return;
  }

  state.cloudStateReady = false;
  window.clearTimeout(remoteSyncTimer);
  state.syncStatus = "loading";
  render({ preserveScroll: true });

  try {
    const remoteState = await loadUserState(state.authUser.id);
    if (remoteState) {
      applyUserStatePayload(remoteState);
    } else if (options.migrateLocal) {
      await saveUserState(state.authUser.id, userStatePayload());
      await migrateLocalPostsToPublicFeed();
    }
    state.remotePosts = await loadPublicPosts();
    state.cloudStateReady = true;
    state.syncStatus = "synced";
    persistLocalData({ remote: false });
    render({ preserveScroll: true });
  } catch {
    state.cloudStateReady = false;
    state.syncStatus = "error";
    render({ preserveScroll: true });
  }
}

async function migrateLocalPostsToPublicFeed() {
  if (!state.authUser || !state.userPosts.length) return;
  const migrated = [];
  for (const post of state.userPosts) {
    migrated.push(await savePublicPost(state.authUser.id, post));
  }
  state.remotePosts = mergePosts(migrated, state.remotePosts);
  state.userPosts = [];
}

function mergePosts(...lists) {
  const seen = new Set();
  return lists.flat().filter((post) => {
    if (!post?.id || seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

let addBookSearchTimer = null;
let addBookRequestId = 0;
let composeBookSearchTimer = null;
let composeBookRequestId = 0;
let remoteSyncTimer = null;
let unsubscribeAuth = () => {};

const CUSTOM_COVER_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 170'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%23e2b866'/%3E%3Cstop offset='1' stop-color='%23713027'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='170' rx='12' fill='url(%23g)'/%3E%3Cpath d='M30 44h60M30 62h42M30 126h60' stroke='%23f7ead7' stroke-width='5' stroke-linecap='round' opacity='.74'/%3E%3C/svg%3E";

const fallbackDescriptions = {
  "9780008604202": "A warm, crowded London novel about Maggie, Ed, Phil, and the people around them as heat, money worries, pregnancy, friendship, and old feelings press into one summer weekend."
};

const navItems = [
  { id: "home", label: "Home", icon: "home" },
  { id: "feed", label: "Feed", icon: "spark" },
  { id: "shelves", label: "Shelves", icon: "shelves" },
  { id: "profile", label: "Profile", icon: "person" }
];

const app = document.querySelector("#app");

function setAppViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
}

setAppViewportHeight();
window.visualViewport?.addEventListener("resize", setAppViewportHeight);
window.visualViewport?.addEventListener("scroll", setAppViewportHeight);
window.addEventListener("resize", setAppViewportHeight);
window.addEventListener("orientationchange", () => {
  window.setTimeout(setAppViewportHeight, 120);
});

function icon(name) {
  const icons = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 11.2 12 4l8.2 7.2"/><path d="M5.8 10.4V20h12.4v-9.6"/><path d="M9.3 20v-5.7h5.4V20"/><path d="M15.3 5.8h2.8v3.7"/><path d="M8.2 12.4h2.3v2.3H8.2z"/><path d="M13.5 12.4h2.3v2.3h-2.3z"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z"/></svg>`,
    shelves: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4v16H5z"/><path d="M10 4h4v16h-4z"/><path d="m15 5 3.5-.8 3.4 14.9-3.5.8z"/><path d="M3 20h18"/></svg>`,
    person: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.1a5 5 0 0 0 0-7.1Z"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-3-6 3V4Z"/></svg>`,
    message: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z"/></svg>`,
    compose: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"/></svg>`,
    back: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`,
    rating: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.8 2.3 5 5.4.6-4 3.7 1.1 5.3L12 15.8l-4.8 2.6 1.1-5.3-4-3.7 5.4-.6L12 3.8Z"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>`,
    barcode: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14"/><path d="M7 5v14"/><path d="M11 5v14"/><path d="M14 5v14"/><path d="M20 5v14"/><path d="M17 5v14"/></svg>`,
    camera: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l1.4-2h5.2L16 8h4v11H4V8Z"/><circle cx="12" cy="13.5" r="3.2"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3"/><path d="M4.5 8h15"/><path d="M6 5h12a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V6.5A1.5 1.5 0 0 1 6 5Z"/><path d="M8 12h2M12 12h2M16 12h.1M8 16h2M12 16h2M16 16h.1"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/><path d="M10.5 11v5M13.5 11v5"/></svg>`
  };
  return icons[name] || "";
}

function render(options = {}) {
  if (options.persist !== false) {
    persistLocalData();
  }
  const focusTarget = options.focus ?? captureInputFocus();
  const previousScroll = options.scrollTop ?? state.contentScrollTop ?? document.querySelector(".content")?.scrollTop ?? 0;
  app.innerHTML = `
    <main class="phone-shell ios" data-app-theme="${state.theme}">
      <section class="app-screen page">
        ${renderHeader()}
        <div class="content ${contentViewClass()}">${renderContent()}</div>
        ${state.feedbackPromptBook ? renderFeedbackPrompt() : ""}
        ${state.removeBookPrompt ? renderRemoveBookPrompt() : ""}
        ${renderNav()}
      </section>
    </main>
  `;
  bindEvents();
  requestAnimationFrame(syncPostMoreControls);
  requestAnimationFrame(() => {
    if (options.preserveScroll) {
      const content = document.querySelector(".content");
      if (content) {
        content.scrollTop = previousScroll;
        state.contentScrollTop = content.scrollTop;
      }
    } else {
      state.contentScrollTop = 0;
    }
    restoreInputFocus(focusTarget);
  });
}

function captureInputFocus() {
  const active = document.activeElement;
  if (!active || !["INPUT", "TEXTAREA"].includes(active.tagName)) return null;

  const selector = [
    "data-add-book-search",
    "data-compose-book",
    "data-feed-search",
    "data-manual-title",
    "data-manual-author",
    "data-manual-isbn"
  ].find((attribute) => active.hasAttribute(attribute));

  if (!selector) return null;

  return {
    selector: `[${selector}]`,
    start: active.selectionStart,
    end: active.selectionEnd
  };
}

function restoreInputFocus(target) {
  if (!target) return;

  const focusTarget = typeof target === "string" ? { selector: target } : target;
  if (!focusTarget.selector) return;

  const input = document.querySelector(focusTarget.selector);
  if (!input || !["INPUT", "TEXTAREA"].includes(input.tagName)) return;

  try {
    input.focus({ preventScroll: true });
  } catch {
    input.focus();
  }

  if (typeof input.setSelectionRange === "function") {
    const start = focusTarget.start ?? input.value.length;
    const end = focusTarget.end ?? start;
    input.setSelectionRange(start, end);
  }
}

function contentViewClass() {
  if (state.detailPage) return `content-detail content-detail-${state.detailPage.type}`;
  if (state.addingBook) return "content-add-book";
  if (state.composing) return "content-compose";
  return `content-${state.tab}`;
}

function renderContent() {
  if (state.detailPage) return renderDetailPage();
  if (state.addingBook) return renderAddBookPage();
  return routes[state.tab]();
}

function renderHeader() {
  const titles = {
    home: ["Pockland", "your little book world"],
    feed: ["Feed", "books, places, and tiny reviews"],
    shelves: ["Shelves", "reading, waiting, and already loved"],
    profile: ["Profile", "your reading portrait"]
  };
  const [title, subtitle] = titles[state.tab];

  return `
    <header class="topbar">
      <div>
        <h1>${title}</h1>
        <p class="eyebrow">${subtitle}</p>
      </div>
      ${renderHeaderAction()}
    </header>
  `;
}

function renderFeedbackPrompt() {
  const book = findBook(state.feedbackPromptBook);
  if (!book) return "";

  return `
    <section class="feedback-prompt" role="dialog" aria-label="Leave feedback">
      <form class="feedback-prompt-card" data-feedback-form="${escapeHtml(book.title)}">
        <button class="feedback-prompt-close" type="button" data-feedback-cancel aria-label="Cancel finished">${icon("plus")}</button>
        <div>
          <p class="section-kicker">Finished</p>
          <h2>${escapeHtml(book.title)}</h2>
          <p>Want to leave a rating or a tiny note?</p>
        </div>
        ${renderRatingControl(book, "prompt")}
        <label>
          <span>Feedback</span>
          <textarea name="feedback" rows="2" placeholder="Optional">${escapeHtml(book.myFeedback || "")}</textarea>
        </label>
        <div class="feedback-prompt-actions">
          <button class="button" type="button" data-feedback-skip>Skip</button>
          <button class="button button-fill" type="submit">Save</button>
        </div>
      </form>
    </section>
  `;
}

function renderRemoveBookPrompt() {
  const book = findBook(state.removeBookPrompt);
  if (!book) return "";

  return `
    <section class="feedback-prompt" role="dialog" aria-label="Remove book">
      <div class="feedback-prompt-card remove-book-card">
        <button class="feedback-prompt-close" type="button" data-remove-book-cancel aria-label="Cancel remove">${icon("plus")}</button>
        <div>
          <p class="section-kicker">Remove from library</p>
          <h2>${escapeHtml(book.title)}</h2>
          <p>This will remove the book from your reading shelves and personal shelves. It will still be available in search.</p>
        </div>
        <div class="feedback-prompt-actions">
          <button class="button" type="button" data-remove-book-cancel>Cancel</button>
          <button class="button button-fill remove-confirm-button" type="button" data-remove-book-confirm="${escapeHtml(book.title)}">Remove</button>
        </div>
      </div>
    </section>
  `;
}

function renderHeaderAction() {
  if (state.addingBook || state.detailPage) return "";

  return `<button class="button button-fill icon-button" data-add-book-open aria-label="Add book">${icon("plus")}</button>`;
}

function renderNav() {
  return `
    <nav class="toolbar toolbar-bottom tabbar tabbar-labels bottom-nav" aria-label="Main navigation">
      ${navItems.map((item) => `
        <button class="tab-link nav-item ${state.tab === item.id ? "active" : ""}" data-tab="${item.id}" aria-label="${item.label}">
          ${icon(item.icon)}
          <span>${item.label}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

const routes = {
  home: () => renderHomePage(),
  feed: () => `
    ${state.composing ? renderComposePage() : renderFeedTools()}
    <section class="feed-list">
      ${state.composing ? "" : filteredPosts().map(renderPost).join("")}
      ${!state.composing && filteredPosts().length === 0 ? renderEmptyFeed() : ""}
    </section>
  `,
  shelves: () => `
    ${renderShelfModeTabs()}
    ${state.shelfMode === "reading" ? renderReadingShelvesView() : renderCustomShelves()}
  `,
  profile: () => renderProfilePage()
};

function renderHomePage() {
  ensureOpenLibraryTrending();
  return `
    ${renderCurrentReadingCard()}

    ${renderHomeBookSection("Pick What’s Next", "From your wishlist", wishlistNextPicks(), { compact: true, empty: "Add a few books to your wishlist and this becomes useful." })}
    ${renderHomeBookSection("Trending on Open Library", trendingStatusLabel(), trendingHomeBooks(), { empty: "Trending books are taking a tiny coffee break." })}
    ${renderHomeBookSection("Award Shelf", "Prize winners worth browsing", awardPicks)}
  `;
}

function renderHomeBookSection(title, subtitle, sectionBooks, options = {}) {
  const railId = slugId(`home-${title}`);
  const visibleBooks = sectionBooks.map(hydrateDisplayBook).slice(0, options.compact ? 20 : 20);
  return `
    <section class="section-block home-book-section ${options.compact ? "compact-home-section" : ""}">
      <div class="section-title">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        ${visibleBooks.length > 3 ? `
          <div class="rail-controls" aria-label="${escapeHtml(title)} controls">
            <button type="button" data-rail-scroll="${railId}" data-rail-direction="-1" aria-label="Scroll ${escapeHtml(title)} left"><span aria-hidden="true">&lsaquo;</span></button>
            <button type="button" data-rail-scroll="${railId}" data-rail-direction="1" aria-label="Scroll ${escapeHtml(title)} right"><span aria-hidden="true">&rsaquo;</span></button>
          </div>
        ` : ""}
      </div>
      ${visibleBooks.length ? `
        <div class="book-row home-book-rail" id="${railId}">
          ${visibleBooks.map(renderMiniBookCard).join("")}
        </div>
      ` : `<p class="detail-muted">${escapeHtml(options.empty || "No books yet.")}</p>`}
    </section>
  `;
}

function slugId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderMiniBookCard(book) {
  return `
    <article class="mini-book">
      <div class="mini-cover-wrap">
        ${bookCover(book)}
        ${renderCoverRatingBadge(book)}
      </div>
      <h3>${bookLink(book.title)}</h3>
      <p class="mini-book-author">${authorLink(book.author)}</p>
      ${renderBookStatusControl(book, "mini-status")}
    </article>
  `;
}

function wishlistNextPicks() {
  return books
    .filter((book) => book.status === "Wishlist")
    .sort((a, b) => Number(b.communityRating || 0) - Number(a.communityRating || 0));
}

function trendingHomeBooks() {
  return state.openLibraryTrendingBooks.length ? state.openLibraryTrendingBooks : trendingFallbackPicks;
}

function trendingStatusLabel() {
  if (state.openLibraryTrendingStatus === "loading") return "Checking Open Library";
  if (state.openLibraryTrendingStatus === "error") return "Saved picks while Open Library is quiet";
  return "Weekly Open Library picks";
}

function hydrateDisplayBook(book) {
  const known = books.find((item) => item.title.toLowerCase() === book.title.toLowerCase());
  return known ? { ...book, ...known } : book;
}

function renderProfilePage() {
  const profileName = userDisplayName();
  const profileAvatar = userAvatarUrl();
  const profileBio = state.authUser
    ? "Your synced Pockland reading corner."
    : "Loves small-town stories, bookshop atmosphere, and accidental literary discoveries.";

  return `
    <section class="card profile-card">
      <div class="profile-avatar">
        <img src="${escapeHtml(profileAvatar)}" alt="${escapeHtml(profileName)} profile photo" loading="lazy">
      </div>
      <h2>${escapeHtml(profileName)}</h2>
      <p>${escapeHtml(profileBio)}</p>
      <div class="theme-switch" role="group" aria-label="Theme">
        <button class="${state.theme === "autumn" ? "active" : ""}" data-theme="autumn">Autumn</button>
        <button class="${state.theme === "summer" ? "active" : ""}" data-theme="summer">Summer</button>
      </div>
      ${renderAuthPanel()}
    </section>

    ${renderReadingCalendar()}
  `;
}

function userDisplayName() {
  if (!state.authUser) return "Bookish Human";
  return state.authUser.user_metadata?.full_name
    || state.authUser.user_metadata?.name
    || state.authUser.email
    || "Signed in";
}

function userAvatarUrl() {
  if (!state.authUser) return assetUrl("avatars/you.jpg");
  return state.authUser.user_metadata?.avatar_url
    || state.authUser.user_metadata?.picture
    || assetUrl("avatars/you.jpg");
}

function renderAuthPanel() {
  if (!isSupabaseConfigured) {
    return `
      <div class="auth-panel">
        <span>Local demo mode</span>
        <p>Add Supabase env vars to enable Google sign-in and cloud sync.</p>
      </div>
    `;
  }

  if (state.authStatus === "loading") {
    return `
      <div class="auth-panel">
        <span>Checking account</span>
        <p>Looking for an existing session.</p>
      </div>
    `;
  }

  if (!state.authUser) {
    return `
      <div class="auth-panel">
        <span>Cloud sync</span>
        <p>Sign in to sync shelves, progress, ratings, and posts.</p>
        <button class="soft-button auth-button" type="button" data-auth-google>Continue with Google</button>
      </div>
    `;
  }

  const name = userDisplayName();
  return `
    <div class="auth-panel">
      <span>${escapeHtml(name)}</span>
      <p>${escapeHtml(syncStatusLabel())}</p>
      <button class="soft-button auth-button" type="button" data-auth-signout>Sign out</button>
    </div>
  `;
}

function syncStatusLabel() {
  if (state.syncStatus === "saving") return "Saving changes to the cloud.";
  if (state.syncStatus === "synced") return "Cloud sync is up to date.";
  if (state.syncStatus === "error") return "Cloud sync needs attention.";
  if (state.syncStatus === "loading") return "Loading your cloud library.";
  return "Your library is stored on this device.";
}

function renderCurrentReadingCard() {
  const readingBooks = books.filter((book) => book.status === "Reading");
  if (!readingBooks.length) return "";

  const index = Math.min(state.currentReadingIndex, readingBooks.length - 1);
  state.currentReadingIndex = index;
  const book = readingBooks[index];
  const progress = bookProgress(book);

  return `
    <section class="hero-panel current-reading-card">
      <div>
        <p class="section-kicker">Currently reading</p>
        <div class="hero-title-stack">
          <h2>${bookLink(book.title)}</h2>
          <p class="hero-author">${authorLink(book.author)}</p>
        </div>
        ${displayBookNote(book) ? `<p>${escapeHtml(displayBookNote(book))}</p>` : ""}
      </div>
      ${readingBooks.length > 1 ? `
        <div class="current-reading-nav" aria-label="Current reading books">
          <button type="button" data-current-reading-step="-1" aria-label="Previous book">${icon("back")}</button>
          <span>${index + 1}/${readingBooks.length}</span>
          <button type="button" data-current-reading-step="1" aria-label="Next book">${icon("back")}</button>
        </div>
      ` : ""}
      <button class="finish-reading-button" type="button" data-finish-reading="${escapeHtml(book.title)}" aria-label="Mark as finished">
        ${icon("check")}
      </button>
      ${bookCover(book, "large")}
      ${renderHeroProgressInput(book)}
      <div class="progress-wrap">
        <span>${progress}%</span>
        <div class="progress"><i style="${progressStyle(progress)}"></i></div>
      </div>
    </section>
  `;
}

function renderReadingCalendar() {
  const monthIso = state.readingCalendarMonth || monthIsoFromDate(new Date());
  const [yearRaw, monthRaw] = monthIso.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw) - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const cells = [
    ...Array.from({ length: offset }, (_, index) => ({ id: `empty-${index}`, empty: true })),
    ...Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const iso = dateIso(year, month, day);
      return { id: iso, day, isToday: iso === todayIso(), events: readingEventsForDate(iso) };
    })
  ];

  return `
    <section class="card reading-calendar-section">
      <div class="section-title compact-title reading-calendar-title">
        <h2>Reading calendar</h2>
      </div>
      <div class="calendar-month-control">
        <button type="button" data-reading-calendar-month="-1" aria-label="Previous month"><span aria-hidden="true">&lsaquo;</span></button>
        <span>${new Date(year, month, 1).toLocaleString("en", { month: "long", year: "numeric" })}</span>
        <button type="button" data-reading-calendar-month="1" aria-label="Next month"><span aria-hidden="true">&rsaquo;</span></button>
      </div>
      <div class="reading-calendar-weekdays" aria-hidden="true">
        ${["M", "T", "W", "T", "F", "S", "S"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="reading-calendar-grid">
        ${cells.map((cell) => cell.empty ? `<span class="calendar-day empty" aria-hidden="true"></span>` : renderCalendarDay(cell)).join("")}
      </div>
    </section>
  `;
}

function renderCalendarDay(cell) {
  const hasEvents = cell.events.length > 0;
  return `
    <article class="calendar-day ${hasEvents ? "has-events" : ""} ${cell.isToday ? "today" : ""}" aria-label="${cell.day}">
      <span>${cell.day}</span>
      <div>
        ${cell.events.slice(0, 2).map((event) => `
          <button type="button" data-book-open="${escapeHtml(event.book.title)}" title="${escapeHtml(event.label)}">
            <img src="${event.book.cover}" alt="" loading="lazy">
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function readingEventsForDate(iso) {
  return userBooks().flatMap((book) => {
    const startedAt = book.status === "Reading" || book.status === "Finished"
      ? book.startedAt || inferStartedAt(book)
      : "";
    const finishedAt = book.status === "Finished"
      ? book.finishedAt || inferFinishedAt(book)
      : "";
    const readingDates = Array.isArray(book.readingDates) && (book.status === "Reading" || book.status === "Finished")
      ? book.readingDates
      : [];
    if (startedAt === iso && finishedAt === iso) {
      return [{ type: "same-day", label: `Read ${book.title}`, book }];
    }
    if (startedAt === iso) return [{ type: "started", label: `Started ${book.title}`, book }];
    if (finishedAt === iso) return [{ type: "finished", label: `Finished ${book.title}`, book }];
    if (readingDates.includes(iso)) return [{ type: "reading", label: `Read ${book.title}`, book }];
    return [];
  });
}

function renderHeroProgressInput(book) {
  if (book.readingFormat === "audio") {
    const total = book.totalMinutes || estimateAudioMinutes(book);
    const listened = Math.max(0, Math.min(total, book.listenedMinutes || 0));
    const listenedParts = durationParts(listened);
    return `
      <div class="hero-pages-input hero-time-input" data-audio-progress="${escapeHtml(book.title)}">
        <span>Listened</span>
        <label>
          <input type="number" min="0" value="${listenedParts.hours}" data-audio-listened-hours="${escapeHtml(book.title)}">
          <small>h</small>
        </label>
        <label>
          <input type="number" min="0" max="59" value="${listenedParts.minutes}" data-audio-listened-minutes-part="${escapeHtml(book.title)}">
          <small>m</small>
        </label>
        <small class="hero-time-total">/ ${formatDuration(total)}</small>
      </div>
    `;
  }

  const total = book.totalPages || estimatePages(book);
  const read = Math.max(0, Math.min(total, book.readPages || Math.round(total * ((book.progress || 0) / 100))));
  return `
    <label class="hero-pages-input">
      <span>Pages</span>
      <input type="number" min="0" max="${total}" value="${read}" data-pages-read="${escapeHtml(book.title)}">
      <small>/ ${total}</small>
    </label>
  `;
}

function allPosts() {
  return mergePosts(state.userPosts, state.remotePosts, posts);
}

function shelfBooks() {
  const shelf = shelves[state.currentShelf];
  if (!shelf) return [];
  if (!shelf.status) return userBooks();
  return books.filter((book) => book.status === shelf.status);
}

function shelfCount(id) {
  const shelf = shelves[id];
  if (!shelf) return 0;
  if (!shelf.status) return userBooks().length;
  return books.filter((book) => book.status === shelf.status).length;
}

function userBooks() {
  return books.filter((book) => readingStatuses.includes(book.status));
}

function activeCustomShelf() {
  return customShelves.find((shelf) => shelf.id === state.currentCustomShelf) || null;
}

function customShelfBooks(shelf) {
  if (!shelf) return [];
  return shelf.bookTitles
    .map((title) => findBook(title))
    .filter(Boolean);
}

function renderShelfModeTabs() {
  return `
    <section class="shelf-mode-tabs" aria-label="Shelf sections">
      <button class="${state.shelfMode === "reading" ? "active" : ""}" type="button" data-shelf-mode="reading">
        Reading
      </button>
      <button class="${state.shelfMode === "custom" ? "active" : ""}" type="button" data-shelf-mode="custom">
        My shelves
      </button>
    </section>
  `;
}

function renderReadingShelvesView() {
  return `
    <section class="shelf-tabs" aria-label="Reading shelves">
      ${Object.entries(shelves).map(([id, shelf]) => `
        <button class="${state.currentShelf === id ? "active" : ""}" data-shelf="${id}">
          ${shelf.label}<span>${shelfCount(id)}</span>
        </button>
      `).join("")}
    </section>
    ${renderShelfLibrary()}
  `;
}

function renderShelfLibrary() {
  const title = shelves[state.currentShelf].label;
  const visibleBooks = shelfBooks();

  return `
    <section class="shelf-summary-line">
      <div>
        <p class="section-kicker">Reading shelf</p>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <span>${visibleBooks.length} ${visibleBooks.length === 1 ? "book" : "books"}</span>
    </section>

    <section class="library-list">
      ${visibleBooks.length ? visibleBooks.map((book) => `
        <article class="library-item">
          ${bookCover(book)}
          <div>
            <h3>${bookLink(book.title)}</h3>
            <p>${authorLink(book.author)}</p>
            ${renderShelfProgress(book)}
          </div>
          ${renderShelfBookActions(book)}
        </article>
      `).join("") : `<p class="detail-muted">No books here yet.</p>`}
    </section>
  `;
}

function renderShelfBookActions(book) {
  return renderBookStatusControl(book, "shelf-status", { canRemove: true });
}

function renderCustomShelves() {
  return `
    <section class="custom-shelves">
      <div class="section-title compact-title">
        <h2>My shelves</h2>
        <button class="button soft-button" type="button" data-custom-shelf-create>
          ${state.creatingShelf ? "Cancel" : "New shelf"}
        </button>
      </div>
      ${state.creatingShelf ? `
        <form class="custom-shelf-form" data-custom-shelf-form>
          <input name="name" type="text" placeholder="Shelf name" autocomplete="off" required>
          <button class="button button-fill" type="submit">Create</button>
        </form>
      ` : ""}
      <div class="custom-shelf-list">
        ${customShelves.map((shelf) => `
          <button class="custom-shelf-card" type="button" data-custom-shelf-open="${shelf.id}">
            <span>${escapeHtml(shelf.name)}</span>
            <small>${shelf.bookTitles.length} ${shelf.bookTitles.length === 1 ? "book" : "books"}</small>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAddToCustomShelf(shelf) {
  return `
    <section class="add-to-custom-shelf">
      <div class="section-title compact-title">
        <h2>Add from All</h2>
        <span>${userBooks().length}</span>
      </div>
      <div class="library-list">
        ${userBooks().map((book) => {
          const added = shelf.bookTitles.includes(book.title);
          return `
            <article class="library-item compact-add-row">
              ${bookCover(book)}
              <div>
                <h3>${bookLink(book.title)}</h3>
                <p>${authorLink(book.author)}</p>
              </div>
              <button class="button soft-button" type="button" data-custom-shelf-book="${shelf.id}" data-custom-shelf-book-title="${escapeHtml(book.title)}">
                ${added ? "Remove" : "Add"}
              </button>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCustomShelfPage(shelfId) {
  const shelf = customShelves.find((item) => item.id === shelfId);
  if (!shelf) return renderMissingDetail("Shelf");
  const shelfBooks = customShelfBooks(shelf);

  return `
    <section class="detail-page custom-shelf-page">
      <div class="detail-header">
        <button class="button back-button" type="button" data-detail-back aria-label="Back">${icon("back")}</button>
        <span>My shelf</span>
      </div>
      <section class="custom-shelf-hero">
        <div>
          <h2>${escapeHtml(shelf.name)}</h2>
        </div>
        <span>${shelfBooks.length} ${shelfBooks.length === 1 ? "book" : "books"}</span>
      </section>
      <section class="bookcase-grid" aria-label="${escapeHtml(shelf.name)} books">
        ${shelfBooks.length ? shelfBooks.map((book) => `
          <article class="bookcase-book">
            <div class="mini-cover-wrap">
              ${bookCover(book)}
              ${renderCoverRatingBadge(book)}
            </div>
            <h3>${bookLink(book.title)}</h3>
            <p>${authorLink(book.author)}</p>
          </article>
        `).join("") : `<p class="detail-muted">No books on this shelf yet.</p>`}
      </section>
      ${renderAddToCustomShelf(shelf)}
    </section>
  `;
}

function renderShelfProgress(book) {
  if (book.status === "Reading") {
    return `
      <div class="progress compact"><i style="${progressStyle(bookProgress(book))}"></i></div>
      ${renderInlineRatingBadge(book)}
    `;
  }

  if (book.status === "Finished") {
    return renderInlineRatingBadge(book);
  }

  return renderInlineRatingBadge(book);
}

function readingStatusLabel(book) {
  if (book.status === "Wishlist") return "In wishlist";
  if (book.status === "Reading") return "Reading now";
  if (book.status === "Finished") return "Finished";
  return "Not on your shelves yet";
}

function setBookStatus(title, status, key = "") {
  if (!readingStatuses.includes(status)) return null;

  const normalizedTitle = title.toLowerCase();
  const matchesKey = (item) => key && bookStatusMenuKey(item) === key;
  let book = books.find(matchesKey)
    || books.find((item) => item.title.toLowerCase() === normalizedTitle);
  if (!book) {
    const remoteBook = state.remoteBookResults.find(matchesKey)
      || state.composeBookResults.find(matchesKey)
      || homeDiscoveryBooks().find(matchesKey)
      || state.remoteBookResults.find((item) => item.title.toLowerCase() === normalizedTitle)
      || state.composeBookResults.find((item) => item.title.toLowerCase() === normalizedTitle)
      || homeDiscoveryBooks().find((item) => item.title.toLowerCase() === normalizedTitle);
    book = remoteBook
      ? { ...remoteBook }
      : {
          title,
          author: "Unknown author",
          cover: CUSTOM_COVER_PLACEHOLDER,
          isbn: "Unknown",
          status: "",
          totalPages: 320,
          readPages: 0,
          progress: 0,
          description: "No description yet.",
          note: "Added from a post."
        };
    books = [book, ...books];
  } else {
    ensureKnownBook(book);
  }

  const previousStatus = book.status;
  book.status = status;
  if (status === "Wishlist") {
    book.readPages = 0;
    book.listenedMinutes = 0;
    book.progress = 0;
    book.startedAt = "";
    book.finishedAt = "";
    book.readingDates = [];
  }
  if (status === "Reading") {
    book.startedAt = book.startedAt || todayIso();
    book.finishedAt = "";
    addReadingDate(book, book.startedAt);
    if (book.readingFormat === "audio") {
      book.totalMinutes = book.totalMinutes || estimateAudioMinutes(book);
      book.listenedMinutes = book.listenedMinutes > 0 && book.listenedMinutes < book.totalMinutes ? book.listenedMinutes : 0;
    } else {
      book.readingFormat = book.readingFormat || "paper";
      book.totalPages = book.totalPages || estimatePages(book);
      book.readPages = book.readPages > 0 && book.readPages < book.totalPages ? book.readPages : 0;
    }
    book.progress = bookProgress(book);
  }
  if (status === "Finished") {
    book.startedAt = book.startedAt || todayIso();
    book.finishedAt = book.finishedAt || todayIso();
    addReadingDate(book, book.finishedAt);
    if (book.readingFormat === "audio") {
      book.totalMinutes = book.totalMinutes || estimateAudioMinutes(book);
    } else {
      book.totalPages = book.totalPages || estimatePages(book);
    }
    const previousReadPages = book.readPages || 0;
    const previousListenedMinutes = book.listenedMinutes || 0;
    const previousProgress = book.progress || 0;
    if (book.readingFormat === "audio") {
      book.listenedMinutes = book.totalMinutes;
    } else {
      book.readPages = book.totalPages;
    }
    book.progress = 100;
    if (previousStatus !== "Finished" && !book.myFeedback && !book.myRating) {
      state.feedbackPromptBook = book.title;
      state.feedbackPromptPrevious = {
        title: book.title,
        status: previousStatus || "",
        readPages: previousReadPages,
        listenedMinutes: previousListenedMinutes,
        progress: previousProgress
      };
    }
  }

  syncSearchBookStatus(book, status);
  persistLocalData();
  return book;
}

function addReadingDate(book, iso = todayIso()) {
  if (!book || !iso) return;
  const dates = new Set(Array.isArray(book.readingDates) ? book.readingDates : []);
  dates.add(iso);
  book.readingDates = [...dates].sort();
}

function syncSearchBookStatus(book, status) {
  const key = bookStatusMenuKey(book);
  const normalizedTitle = book.title.toLowerCase();
  [state.remoteBookResults, state.composeBookResults].forEach((list) => {
    list.forEach((item) => {
      const sameBook = bookStatusMenuKey(item) === key || item.title.toLowerCase() === normalizedTitle;
      if (!sameBook) return;

      item.status = status;
      item.readingFormat = book.readingFormat;
      item.readPages = book.readPages;
      item.totalPages = book.totalPages;
      item.listenedMinutes = book.listenedMinutes;
      item.totalMinutes = book.totalMinutes;
      item.progress = book.progress;
      item.myRating = book.myRating;
      item.myFeedback = book.myFeedback;
      item.startedAt = book.startedAt;
      item.finishedAt = book.finishedAt;
    });
  });
}

function removeBookFromLibrary(title) {
  const book = findBook(title);
  if (!book) return;

  book.status = "";
  book.readPages = 0;
  book.listenedMinutes = 0;
  book.progress = 0;
  book.startedAt = "";
  book.finishedAt = "";
  book.myRating = null;
  book.myFeedback = "";
  customShelves = customShelves.map((shelf) => ({
    ...shelf,
    bookTitles: shelf.bookTitles.filter((bookTitle) => bookTitle !== book.title)
  }));
  syncSearchBookStatus(book, "");
  state.removeBookPrompt = "";
  persistLocalData();
}

function enrichAndRender(book, options = {}) {
  const scrollTop = options.preserveScroll
    ? options.scrollTop ?? document.querySelector(".content")?.scrollTop ?? 0
    : undefined;
  enrichOpenLibraryBook(book).then(() => {
    persistLocalData();
    render({ ...options, scrollTop });
  });
}

function estimatePages(book) {
  const knownPages = {
    "Pride and Prejudice": 432,
    Frankenstein: 280,
    "Little Women": 759,
    "Jane Eyre": 532
  };
  return knownPages[book.title] || 320;
}

function estimateAudioMinutes(book) {
  const knownMinutes = {
    "Pride and Prejudice": 690,
    Frankenstein: 510,
    "Little Women": 1140,
    "Jane Eyre": 1120
  };
  return book.totalMinutes || knownMinutes[book.title] || Math.round((book.totalPages || estimatePages(book)) * 1.8);
}

function bookProgress(book) {
  if (book.readingFormat === "audio") {
    const total = book.totalMinutes || estimateAudioMinutes(book);
    const listened = Math.max(0, Math.min(total, book.listenedMinutes || Math.round(total * ((book.progress || 0) / 100))));
    return Math.round((listened / total) * 100);
  }

  const total = book.totalPages || estimatePages(book);
  const read = Math.max(0, Math.min(total, book.readPages || Math.round(total * ((book.progress || 0) / 100))));
  return Math.round((read / total) * 100);
}

function ratingLine(book) {
  const community = bookFeedback(book).rating;
  if (book.myRating) return `Your rating ${book.myRating}`;
  return `Rating ${community}`;
}

function renderCoverRatingBadge(book) {
  const value = book.myRating || bookFeedback(book).rating;
  const iconName = book.myRating ? "person" : "rating";
  const label = book.myRating ? `Your rating ${value}` : `Reader rating ${value}`;

  return `
    <span class="cover-rating-badge ${book.myRating ? "personal" : ""}" aria-label="${label}">
      ${icon(iconName)}${value}
    </span>
  `;
}

function renderInlineRatingBadge(book) {
  const value = book.myRating || bookFeedback(book).rating;
  const iconName = book.myRating ? "person" : "rating";
  const label = book.myRating ? `Your rating ${value}` : `Reader rating ${value}`;

  return `
    <span class="inline-rating-badge ${book.myRating ? "personal" : ""}" aria-label="${label}">
      ${icon(iconName)}${value}
    </span>
  `;
}

function renderRatingControl(book, variant = "") {
  const value = Number(book.myRating || 0);
  return `
    <div class="rating-control ${variant ? `rating-control-${variant}` : ""}" data-rating-book="${escapeHtml(book.title)}">
      <span>My rating</span>
      <div class="rating-stepper">
        <button type="button" data-rating-step="${escapeHtml(book.title)}" data-rating-delta="-0.5" aria-label="Decrease rating">-</button>
        <strong>${value ? value.toFixed(value % 1 ? 1 : 0) : "-"}</strong>
        <button type="button" data-rating-step="${escapeHtml(book.title)}" data-rating-delta="0.5" aria-label="Increase rating">+</button>
      </div>
    </div>
  `;
}

function setBookRating(title, rating) {
  const book = findBook(title);
  if (!book) return;
  const normalizedRating = normalizeUserRating(rating);
  if (normalizedRating) book.myRating = normalizedRating;
  persistLocalData();
}

function normalizeUserRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return `${Math.max(0.5, Math.min(5, Math.round(number * 2) / 2))}`;
}

function bookCardMeta(book) {
  const status = readingStatusLabel(book)
    .replace("In wishlist", "Wishlist")
    .replace("Not on your shelves yet", "Not added");
  return `${status} · ${ratingLine(book)}`;
}

function updateBookPages(title, pages) {
  const book = findBook(title);
  if (!book) return;
  book.readingFormat = "paper";
  book.totalPages = book.totalPages || estimatePages(book);
  book.readPages = Math.max(0, Math.min(book.totalPages, pages));
  book.progress = bookProgress(book);
  if (book.readPages > 0) addReadingDate(book);
  if (book.readPages >= book.totalPages) {
    setBookStatus(book.title, "Finished");
  } else if (book.readPages > 0 && book.status !== "Reading") {
    book.status = "Reading";
    book.startedAt = book.startedAt || todayIso();
    book.finishedAt = "";
  } else if (book.readPages > 0) {
    book.startedAt = book.startedAt || todayIso();
  }
  persistLocalData();
}

function updateReadingFormat(title, format) {
  const book = findBook(title);
  if (!book || !["paper", "audio"].includes(format)) return;
  book.readingFormat = format;

  if (format === "audio") {
    book.totalMinutes = book.totalMinutes || estimateAudioMinutes(book);
    book.listenedMinutes = Math.round(book.totalMinutes * ((book.progress || 0) / 100));
  } else {
    book.totalPages = book.totalPages || estimatePages(book);
    book.readPages = Math.round(book.totalPages * ((book.progress || 0) / 100));
  }
  book.progress = bookProgress(book);
  persistLocalData();
}

function updateAudioProgress(title, listenedMinutes, totalMinutes) {
  const book = findBook(title);
  if (!book) return;
  book.readingFormat = "audio";
  book.totalMinutes = Math.max(1, totalMinutes || book.totalMinutes || estimateAudioMinutes(book));
  book.listenedMinutes = Math.max(0, Math.min(book.totalMinutes, listenedMinutes || 0));
  book.progress = bookProgress(book);
  if (book.listenedMinutes > 0) addReadingDate(book);
  if (book.listenedMinutes >= book.totalMinutes) {
    setBookStatus(book.title, "Finished");
  } else if (book.listenedMinutes > 0 && book.status !== "Reading") {
    book.status = "Reading";
    book.startedAt = book.startedAt || todayIso();
    book.finishedAt = "";
  } else if (book.listenedMinutes > 0) {
    book.startedAt = book.startedAt || todayIso();
  }
  persistLocalData();
}

function updateFinishedDate(title, value) {
  const book = findBook(title);
  if (!book || book.status !== "Finished") return;
  const previousFinishedAt = book.finishedAt;
  book.finishedAt = value || todayIso();
  if (previousFinishedAt && Array.isArray(book.readingDates)) {
    book.readingDates = book.readingDates.filter((date) => date !== previousFinishedAt || date === book.startedAt);
  }
  addReadingDate(book, book.finishedAt);
  persistLocalData();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateIso(year, month, day) {
  const mm = `${month + 1}`.padStart(2, "0");
  const dd = `${day}`.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function monthIsoFromDate(date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function shiftMonthIso(monthIso, step) {
  const [yearRaw, monthRaw] = monthIso.split("-");
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1 + step, 1);
  return monthIsoFromDate(date);
}

function formatDateLabel(iso) {
  if (!iso) return "Choose date";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function inferStartedAt(book) {
  if (book.status === "Reading" && bookProgress(book) > 0) return todayIso();
  if (book.status === "Finished") return book.startedAt || book.finishedAt || "";
  return "";
}

function inferFinishedAt(book) {
  if (book.finishedAtUnknown) return "";
  return book.status === "Finished" ? book.finishedAt || "" : "";
}

function durationParts(minutes) {
  const total = Math.max(0, Math.round(minutes || 0));
  return {
    hours: Math.floor(total / 60),
    minutes: total % 60
  };
}

function minutesFromParts(hours, minutes) {
  return Math.max(0, (Number(hours) || 0) * 60 + (Number(minutes) || 0));
}

function formatDuration(minutes) {
  const parts = durationParts(minutes);
  if (!parts.hours) return `${parts.minutes}m`;
  if (!parts.minutes) return `${parts.hours}h`;
  return `${parts.hours}h ${parts.minutes}m`;
}

function saveBookFeedback(title, rating, text) {
  const book = findBook(title);
  if (!book) return;
  const normalizedRating = normalizeUserRating(rating);
  if (normalizedRating) book.myRating = normalizedRating;
  if (text) book.myFeedback = text;
  state.feedbackPromptBook = "";
  state.feedbackPromptPrevious = null;
  state.editingFeedbackBook = "";
  persistLocalData();
}

function cancelFinishedPrompt() {
  const previous = state.feedbackPromptPrevious;
  const book = previous ? findBook(previous.title) : null;
  if (book) {
    book.status = previous.status;
    book.readPages = previous.readPages;
    book.listenedMinutes = previous.listenedMinutes;
    book.progress = previous.progress;
  }
  state.feedbackPromptBook = "";
  state.feedbackPromptPrevious = null;
  persistLocalData();
}

function feedBookOptions() {
  return [...new Set([...books.map((book) => book.title), ...allPosts().map((post) => post.book)])];
}

function feedSuggestions() {
  const query = state.feedSearchText.trim().toLowerCase();
  if (!query || state.feedQuery === state.feedSearchText) return [];

  return feedBookOptions()
    .filter((title) => title.toLowerCase().includes(query))
    .slice(0, 4);
}

function addBookResults() {
  const query = state.addBookQuery.trim().toLowerCase();
  if (!query) return books;

  const localResults = books.filter((book) =>
    book.title.toLowerCase().includes(query)
    || book.author.toLowerCase().includes(query)
    || book.isbn.includes(query.replaceAll("-", ""))
    || book.isbn.includes(query)
  );
  const seen = new Set(localResults.map((book) => book.title.toLowerCase()));
  const seenKeys = new Set(localResults.flatMap((book) => [
    book.openLibraryEditionKey,
    book.openLibraryKey,
    book.isbn
  ].filter(Boolean)));
  const remoteResults = state.remoteBookResults.filter((book) =>
    !seen.has(book.title.toLowerCase()) && !seenKeys.has(bookStatusMenuKey(book))
  );

  return [...localResults, ...remoteResults];
}

function homeDiscoveryBooks() {
  return [
    ...state.openLibraryTrendingBooks,
    ...trendingFallbackPicks,
    ...awardPicks
  ];
}

function ensureOpenLibraryTrending() {
  if (state.tab !== "home" || state.openLibraryTrendingStatus !== "idle") return;
  state.openLibraryTrendingStatus = "loading";
  fetchOpenLibraryTrendingBooks()
    .then((results) => {
      state.openLibraryTrendingBooks = results;
      state.openLibraryTrendingStatus = "done";
      render({ preserveScroll: true });
    })
    .catch(() => {
      state.openLibraryTrendingBooks = [];
      state.openLibraryTrendingStatus = "error";
      render({ preserveScroll: true });
    });
}

async function fetchOpenLibraryTrendingBooks() {
  const response = await fetchWithTimeout("https://openlibrary.org/trending/weekly.json?limit=50", 7000);
  if (!response.ok) throw new Error("Open Library trending failed");
  const data = await response.json();
  const seen = new Set(books.map((book) => book.title.toLowerCase()));
  const results = qualityTrendingBooks(data.works || data.docs || [])
    .map(openLibraryBook)
    .filter(Boolean)
    .filter((book) => !seen.has(book.title.toLowerCase()))
    .slice(0, 20);
  if (results.length < 8) throw new Error("Open Library trending returned too few usable books");
  return results;
}

function qualityTrendingBooks(items) {
  const seen = new Set();

  return items.filter((item) => {
    const title = item.title?.trim();
    const author = item.author_name?.[0] || item.authors?.[0]?.name;
    const coverId = item.cover_i || item.cover_id || item.covers?.[0];
    const rating = Number(item.ratings_average || 0);
    const ratingsCount = Number(item.ratings_count || 0);

    if (!title || !author || !coverId) return false;
    if (seen.has(title.toLowerCase())) return false;
    if (rating && (rating < 3.7 || ratingsCount < 30)) return false;

    seen.add(title.toLowerCase());
    return true;
  });
}

async function fetchWithTimeout(url, timeoutMs = 7000, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function queueRemoteBookSearch(query) {
  window.clearTimeout(addBookSearchTimer);
  const value = query.trim();
  if (value.length < 3) {
    state.remoteBookResults = [];
    state.remoteBookStatus = "idle";
    return;
  }

  state.remoteBookStatus = "loading";
  const requestId = addBookRequestId + 1;
  addBookRequestId = requestId;
  addBookSearchTimer = window.setTimeout(() => {
    searchOnlineBooks(value, requestId);
  }, 450);
}

async function searchOnlineBooks(query, requestId) {
  try {
    const results = await fetchBookSearchResults(query);
    if (requestId !== addBookRequestId || state.addBookQuery.trim() !== query) return;

    state.remoteBookResults = results;
    state.remoteBookStatus = "done";
    render({ preserveScroll: true, persist: false, focus: "[data-add-book-search]" });
  } catch {
    if (requestId !== addBookRequestId) return;
    state.remoteBookResults = [];
    state.remoteBookStatus = "error";
    render({ preserveScroll: true, persist: false, focus: "[data-add-book-search]" });
  }
}

async function fetchBookSearchResults(query) {
  const [openLibrary, googleBooks] = await Promise.allSettled([
    fetchOpenLibraryBooks(query),
    fetchGoogleBooks(query)
  ]);

  const openLibraryResults = openLibrary.status === "fulfilled" ? openLibrary.value : [];
  const googleResults = googleBooks.status === "fulfilled" ? googleBooks.value : [];
  const results = uniqueBookResults([...openLibraryResults, ...googleResults]);

  if (!results.length && openLibrary.status === "rejected" && googleBooks.status === "rejected") {
    throw new Error("Book search failed");
  }

  return results;
}

async function fetchOpenLibraryBooks(query) {
  const params = new URLSearchParams({
    q: query,
    fields: "key,title,author_name,isbn,cover_i,first_publish_year,number_of_pages_median,number_of_pages,first_sentence,subtitle,edition_key,ratings_average,ratings_count",
    limit: "8"
  });
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
  if (!response.ok) throw new Error("Open Library search failed");
  const data = await response.json();
  return (data.docs || [])
    .map(openLibraryBook)
    .filter(Boolean);
}

async function fetchGoogleBooks(query) {
  const params = new URLSearchParams({
    q: query,
    maxResults: "10",
    printType: "books"
  });
  if (GOOGLE_BOOKS_API_KEY) params.set("key", GOOGLE_BOOKS_API_KEY);
  const response = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, 7000);
  if (!response.ok) throw new Error("Google Books search failed");
  const data = await response.json();
  return (data.items || [])
    .map(googleBook)
    .filter(Boolean);
}

function uniqueBookResults(results) {
  const seen = new Set();

  return results.filter((book) => {
    const isbn = cleanIsbn(book.isbn);
    const key = isbn
      ? `isbn:${isbn}`
      : `title:${normalizeForMatch(book.title)}|author:${normalizeForMatch(book.author)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function queueComposeBookSearch(query) {
  window.clearTimeout(composeBookSearchTimer);
  const value = query.trim();
  if (value.length < 3) {
    state.composeBookResults = [];
    state.composeBookStatus = "idle";
    return;
  }

  state.composeBookStatus = "loading";
  const requestId = composeBookRequestId + 1;
  composeBookRequestId = requestId;
  composeBookSearchTimer = window.setTimeout(async () => {
    try {
      const results = await fetchBookSearchResults(value);
      if (requestId !== composeBookRequestId || state.composeBookQuery.trim() !== value) return;
      state.composeBookResults = results;
      state.composeBookStatus = "done";
      render({ preserveScroll: true, persist: false, focus: "[data-compose-book]" });
    } catch {
      if (requestId !== composeBookRequestId) return;
      state.composeBookResults = [];
      state.composeBookStatus = "error";
      render({ preserveScroll: true, persist: false, focus: "[data-compose-book]" });
    }
  }, 450);
}

function openLibraryBook(item) {
  const title = item.title;
  const author = item.author_name?.[0] || item.authors?.[0]?.name || "Unknown author";
  const coverId = item.cover_i || item.cover_id || item.covers?.[0];
  if (!title) return null;

  return {
    title,
    author,
    cover: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : CUSTOM_COVER_PLACEHOLDER,
    isbn: item.isbn?.[0] || item.isbn_13?.[0] || item.isbn_10?.[0] || "Unknown",
    status: "",
    totalPages: item.number_of_pages || item.number_of_pages_median || 320,
    readPages: 0,
    progress: 0,
    openLibraryKey: item.key || "",
    openLibraryEditionKey: item.edition_key?.[0] || "",
    communityRating: item.ratings_average ? Number(item.ratings_average).toFixed(1) : "",
    ratingsCount: item.ratings_count || 0,
    description: item.first_sentence?.[0] || item.subtitle || "No description yet.",
    note: "Imported from the book database."
  };
}

function googleBook(item) {
  const volume = item.volumeInfo || {};
  const title = volume.title?.trim();
  if (!title) return null;

  const identifiers = volume.industryIdentifiers || [];
  const isbn = identifiers.find((identifier) => identifier.type === "ISBN_13")?.identifier
    || identifiers.find((identifier) => identifier.type === "ISBN_10")?.identifier
    || identifiers[0]?.identifier
    || "Unknown";
  const cover = volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail || "";

  return {
    title,
    author: volume.authors?.[0] || "Unknown author",
    cover: cover ? cover.replace(/^http:/, "https:") : CUSTOM_COVER_PLACEHOLDER,
    isbn,
    status: "",
    totalPages: volume.pageCount || 320,
    readPages: 0,
    progress: 0,
    googleBooksId: item.id || "",
    openLibraryKey: "",
    openLibraryEditionKey: "",
    communityRating: volume.averageRating ? Number(volume.averageRating).toFixed(1) : "",
    ratingsCount: volume.ratingsCount || 0,
    description: normalizeOpenLibraryText(volume.description) || "No description yet.",
    note: "Imported from the book database."
  };
}

async function enrichOpenLibraryBook(book) {
  const isbn = cleanIsbn(book?.isbn);
  if (!book || !book.title) return book;
  if (book.openLibraryLoaded && hasUsefulDescription(book.description) && book.communityRating && !bookNeedsCover(book)) return book;

  try {
    const searchMatch = book.communityRating && !bookNeedsCover(book) ? null : await fetchOpenLibraryRatingMatch(book);
    const edition = book.openLibraryEditionKey
      ? await fetchOpenLibraryJson(`/books/${book.openLibraryEditionKey}`)
      : isbn ? await fetchOpenLibraryJson(`/isbn/${isbn}`) : null;
    const workKey = book.openLibraryKey || edition?.works?.[0]?.key || "";
    const work = workKey ? await fetchOpenLibraryJson(workKey) : null;

    const description = normalizeOpenLibraryText(work?.description)
      || normalizeOpenLibraryText(edition?.description)
      || book.description;
    const googleDescription = hasUsefulDescription(description)
      ? ""
      : await fetchGoogleBooksDescription(book);
    const fallbackDescription = hasUsefulDescription(description) || googleDescription
      ? ""
      : fallbackBookDescription(book);
    const pages = edition?.number_of_pages || work?.number_of_pages || book.totalPages;
    const subjects = Array.isArray(work?.subjects) ? work.subjects.slice(0, 5) : book.subjects;
    const openLibraryCover = coverFromOpenLibraryData(edition)
      || coverFromOpenLibraryData(work)
      || searchMatch?.cover
      || "";
    const googleMetadata = openLibraryCover && hasUsefulDescription(googleDescription)
      ? null
      : await fetchGoogleBooksMetadata(book);

    Object.assign(book, {
      cover: bookNeedsCover(book) ? (openLibraryCover || googleMetadata?.cover || book.cover || "") : book.cover,
      description: googleMetadata?.description || googleDescription || fallbackDescription || description || "No description yet.",
      totalPages: googleMetadata?.totalPages || pages || book.totalPages || 320,
      subjects: subjects || [],
      openLibraryKey: workKey || searchMatch?.openLibraryKey || book.openLibraryKey || "",
      openLibraryEditionKey: book.openLibraryEditionKey || edition?.key?.replace("/books/", "") || searchMatch?.openLibraryEditionKey || "",
      communityRating: searchMatch?.communityRating || book.communityRating || googleMetadata?.communityRating || "",
      ratingsCount: searchMatch?.ratingsCount || book.ratingsCount || googleMetadata?.ratingsCount || 0,
      openLibraryLoaded: true
    });
  } catch {
    const googleMetadata = await fetchGoogleBooksMetadata(book);
    const fallbackDescription = googleMetadata?.description ? "" : fallbackBookDescription(book);
    if (bookNeedsCover(book) && googleMetadata?.cover) book.cover = googleMetadata.cover;
    if (googleMetadata?.description || fallbackDescription) book.description = googleMetadata?.description || fallbackDescription;
    if (googleMetadata?.totalPages) book.totalPages = googleMetadata.totalPages;
    if (!book.communityRating && googleMetadata?.communityRating) book.communityRating = googleMetadata.communityRating;
    if (!book.ratingsCount && googleMetadata?.ratingsCount) book.ratingsCount = googleMetadata.ratingsCount;
    book.openLibraryLoaded = hasUsefulDescription(book.description) && Boolean(book.communityRating) && !bookNeedsCover(book);
  }

  return book;
}

function bookNeedsCover(book) {
  return !book?.cover || book.cover === CUSTOM_COVER_PLACEHOLDER;
}

function coverFromOpenLibraryData(data) {
  const coverId = data?.covers?.[0] || data?.cover_i || data?.cover_id;
  if (coverId) return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
  return "";
}

async function fetchOpenLibraryJson(path) {
  const response = await fetch(`https://openlibrary.org${path}.json`);
  if (!response.ok) throw new Error("Open Library detail failed");
  return response.json();
}

async function fetchOpenLibraryRatingMatch(book) {
  try {
    const params = new URLSearchParams({
      fields: "key,title,author_name,isbn,edition_key,ratings_average,ratings_count",
      limit: "5"
    });
    const isbn = cleanIsbn(book?.isbn);
    if (isbn) {
      params.set("isbn", isbn);
    } else {
      params.set("title", book.title);
      if (book.author && book.author !== "Unknown author") params.set("author", book.author);
    }

    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json();
    const match = (data.docs || []).find((item) => openLibrarySearchMatch(item, book)) || data.docs?.[0];
    if (!match?.ratings_average) return null;

    return {
      openLibraryKey: match.key || book.openLibraryKey || "",
      openLibraryEditionKey: match.edition_key?.[0] || book.openLibraryEditionKey || "",
      cover: match.cover_i ? `https://covers.openlibrary.org/b/id/${match.cover_i}-M.jpg` : "",
      communityRating: Number(match.ratings_average).toFixed(1),
      ratingsCount: match.ratings_count || 0
    };
  } catch {
    return null;
  }
}

function openLibrarySearchMatch(item, book) {
  const isbn = cleanIsbn(book?.isbn);
  if (isbn && (item.isbn || []).some((value) => cleanIsbn(value) === isbn)) return true;

  const title = normalizeForMatch(book?.title);
  const itemTitle = normalizeForMatch(item.title);
  const author = normalizeForMatch(book?.author);
  const itemAuthors = (item.author_name || []).map(normalizeForMatch);
  return Boolean(title && itemTitle && (title === itemTitle || itemTitle.includes(title)) && (!author || itemAuthors.includes(author)));
}

async function fetchGoogleBooksDescription(book) {
  const metadata = await fetchGoogleBooksMetadata(book);
  return metadata.description;
}

async function fetchGoogleBooksMetadata(book) {
  try {
    const query = googleBooksQuery(book);
    if (!query) return emptyGoogleBooksMetadata();

    const params = new URLSearchParams({
      q: query,
      maxResults: "5",
      printType: "books"
    });
    if (GOOGLE_BOOKS_API_KEY) params.set("key", GOOGLE_BOOKS_API_KEY);
    const response = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, 7000);
    if (!response.ok) return emptyGoogleBooksMetadata();

    const data = await response.json();
    const exact = (data.items || []).find((item) => googleBookMatches(item.volumeInfo, book));
    const volume = exact?.volumeInfo || data.items?.[0]?.volumeInfo;
    if (!volume) return emptyGoogleBooksMetadata();

    const cover = volume?.imageLinks?.thumbnail || volume?.imageLinks?.smallThumbnail || "";
    return {
      description: normalizeOpenLibraryText(volume?.description),
      cover: cover.replace(/^http:/, "https:"),
      totalPages: volume.pageCount || 0,
      communityRating: volume.averageRating ? Number(volume.averageRating).toFixed(1) : "",
      ratingsCount: volume.ratingsCount || 0
    };
  } catch {
    return emptyGoogleBooksMetadata();
  }
}

function emptyGoogleBooksMetadata() {
  return {
    description: "",
    cover: "",
    totalPages: 0,
    communityRating: "",
    ratingsCount: 0
  };
}

function googleBooksQuery(book) {
  const isbn = cleanIsbn(book?.isbn);
  if (isbn) return `isbn:${isbn}`;

  const title = `${book?.title || ""}`.trim();
  const author = `${book?.author || ""}`.trim();
  if (!title) return "";
  return author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
}

function googleBookMatches(volume, book) {
  if (!volume) return false;

  const isbn = cleanIsbn(book?.isbn);
  const identifiers = volume.industryIdentifiers || [];
  if (isbn && identifiers.some((item) => cleanIsbn(item.identifier) === isbn)) return true;

  const title = normalizeForMatch(book?.title);
  const volumeTitle = normalizeForMatch(volume.title);
  return Boolean(title && volumeTitle && (title === volumeTitle || volumeTitle.includes(title)));
}

function normalizeOpenLibraryText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value.value === "string") return value.value.trim();
  return "";
}

function hasUsefulDescription(value) {
  const description = normalizeOpenLibraryText(value);
  return Boolean(description && description !== "No description yet.");
}

function fallbackBookDescription(book) {
  const isbn = cleanIsbn(book?.isbn);
  return fallbackDescriptions[isbn] || "";
}

function cleanIsbn(value) {
  const isbn = `${value || ""}`.replaceAll("-", "").trim();
  return isbn && isbn !== "Unknown" && isbn !== "Custom" ? isbn : "";
}

function normalizeForMatch(value) {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function restoreAddBookSearchFocus() {
  restoreInputFocus("[data-add-book-search]");
}

function restoreComposeBookFocus() {
  restoreInputFocus("[data-compose-book]");
}

function filteredPosts() {
  const selectedBook = state.feedQuery.trim().toLowerCase();
  return allPosts().filter((post) => {
    const matchesQuery = !selectedBook || post.book.toLowerCase() === selectedBook;
    const matchesFilter =
      state.feedFilter === "all"
      || (state.feedFilter === "saved" && state.saved.has(post.id))
      || (state.feedFilter === "liked" && state.liked.has(post.id));
    return matchesQuery && matchesFilter;
  });
}

function renderFeedTools() {
  const suggestions = feedSuggestions();
  return `
    <section class="feed-tools">
      <label class="feed-search">
        ${icon("search")}
        <input type="search" data-feed-search placeholder="Search by book" value="${escapeHtml(state.feedSearchText)}" autocomplete="off">
        ${state.feedQuery ? `<button class="feed-search-clear" type="button" data-feed-search-clear aria-label="Clear search">×</button>` : ""}
      </label>
      <button class="feed-compose-button" data-compose-open aria-label="Share a reading moment">
        ${icon("compose")}
      </button>
    </section>
    ${suggestions.length ? `
      <section class="feed-suggestions" aria-label="Book suggestions">
        ${suggestions.map((title) => `
          <button type="button" data-feed-book="${escapeHtml(title)}">${escapeHtml(title)}</button>
        `).join("")}
      </section>
    ` : ""}
    <section class="feed-filters" aria-label="Feed filters">
      ${["all", "saved", "liked"].map((filter) => `
        <button class="${state.feedFilter === filter ? "active" : ""}" data-feed-filter="${filter}">
          ${filter[0].toUpperCase()}${filter.slice(1)}
        </button>
      `).join("")}
    </section>
  `;
}

function renderAddBookPage() {
  if (state.manualBookPage) return renderManualBookForm();

  const results = addBookResults();
  const showManualBook = state.addBookQuery.trim().length > 0 && results.length === 0;

  return `
    <section class="add-book-page">
      <div class="add-page-header">
        <button class="button back-button" type="button" data-add-book-close aria-label="Back">${icon("back")}</button>
        <div>
          <h2>Add Book</h2>
          <p>Search, scan, or add manually.</p>
        </div>
      </div>
      <div class="add-search-block">
        <label class="add-search-field">
          ${icon("search")}
          <input type="search" data-add-book-search placeholder="Search title, author, or ISBN" value="${escapeHtml(state.addBookQuery)}" autocomplete="off">
        </label>
        <div class="scan-actions" aria-label="Scan options">
          <button type="button" data-scan-barcode>
            ${icon("barcode")}
            <span>Scan barcode</span>
          </button>
          <button type="button" data-scan-cover>
            ${icon("camera")}
            <span>Scan cover</span>
          </button>
        </div>
      </div>

      <section class="add-results">
        <div class="section-title compact-title">
          <h2>${state.addBookQuery ? "Matches" : "Popular in the library"}</h2>
          <span>${remoteSearchLabel(results.length)}</span>
        </div>
        ${state.remoteBookStatus === "loading" && !results.length
          ? renderSearchingBooks()
          : results.length ? results.map(renderAddBookResult).join("") : renderNoBookResults()
        }
      </section>

      ${showManualBook ? `
        <section class="manual-book-card">
          <div>
            <p class="section-kicker">Book not found?</p>
            <h2>Add a new title</h2>
            <p>Fill in the details yourself and keep it on your shelf.</p>
          </div>
          <button class="button soft-button" type="button" data-add-manual>Add custom book</button>
        </section>
      ` : ""}
    </section>
  `;
}

function renderAddBookResult(book) {
  return `
    <article class="add-result-card">
      ${bookCover(book)}
      <div>
        <h3>${bookLink(book.title)}</h3>
        <p>${authorLink(book.author)}</p>
        <span>ISBN ${book.isbn}</span>
      </div>
      ${renderBookStatusControl(book)}
    </article>
  `;
}

function renderBookStatusControl(book, className = "", options = {}) {
  const value = readingStatuses.includes(book.status) ? book.status : "";
  const label = value ? (value === "Reading" ? "Reading now" : value) : "Add to Wishlist";
  const menuKey = bookStatusMenuKey(book);
  const menuOpen = state.openStatusMenu === menuKey;
  const menuDirection = menuOpen && state.openStatusMenuDirection === "up" ? "menu-up" : "";

  return `
    <div class="book-status-control ${className} ${menuOpen ? "menu-open" : ""} ${menuDirection}">
      <button type="button" data-book-status-quick="${escapeHtml(book.title)}" data-book-status-key="${escapeHtml(menuKey)}" data-book-status-value="${value || "Wishlist"}">
        ${label}
      </button>
      <button class="book-status-arrow" type="button" data-book-status-menu="${escapeHtml(menuKey)}" aria-label="Change reading status">
        <span aria-hidden="true"></span>
      </button>
      ${menuOpen ? `
        <div class="book-status-menu" role="menu">
          ${readingStatuses.map((status) => `
            <button type="button" role="menuitem" data-book-status-choice="${escapeHtml(book.title)}" data-book-status-key="${escapeHtml(menuKey)}" data-book-status-value="${status}">
              ${status === "Reading" ? "Reading now" : status}
            </button>
          `).join("")}
          ${options.canRemove ? `
            <span class="book-status-separator" aria-hidden="true"></span>
            <button class="book-status-delete" type="button" role="menuitem" data-remove-book-prompt="${escapeHtml(book.title)}">
              Delete
            </button>
          ` : ""}
        </div>
      ` : ""}
    </div>
  `;
}

function statusMenuDirection(button) {
  const control = button.closest(".book-status-control");
  const rect = control?.getBoundingClientRect();
  if (!rect) return "down";
  const tabBarTop = document.querySelector(".tab-bar")?.getBoundingClientRect().top;
  const screenBottom = document.querySelector(".app-screen")?.getBoundingClientRect().bottom;
  const lowerBoundary = Math.min(tabBarTop || Infinity, screenBottom || Infinity, window.innerHeight) - 8;
  const spaceBelow = lowerBoundary - rect.bottom;
  const spaceAbove = rect.top - 8;
  return spaceBelow < 156 && spaceAbove > spaceBelow ? "up" : "down";
}

function bookStatusMenuKey(book) {
  return book.openLibraryEditionKey
    || book.openLibraryKey
    || book.isbn
    || book.title;
}

function remoteSearchLabel(count) {
  if (!state.addBookQuery.trim()) return count;
  if (state.remoteBookStatus === "loading") return "Searching online...";
  if (state.remoteBookStatus === "error") return "Local results";
  return count;
}

function renderNoBookResults() {
  return `
    <div class="add-empty">
      <h2>Oops, no book found</h2>
      <p>Try another title, author, ISBN, or add the book manually.</p>
    </div>
  `;
}

function renderSearchingBooks() {
  return `
    <div class="add-empty">
      <h2>Searching books</h2>
      <p>Checking the online book database.</p>
    </div>
  `;
}

function renderDetailPage() {
  if (state.detailPage.type === "author") {
    return renderAuthorPage(state.detailPage.value);
  }
  if (state.detailPage.type === "customShelf") {
    return renderCustomShelfPage(state.detailPage.value);
  }

  return renderBookPage(state.detailPage.value);
}

function renderBookPage(title) {
  const book = findBook(title);
  if (!book) return renderMissingDetail("Book");
  const relatedPosts = allPosts().filter((post) => post.book === book.title);
  const feedback = bookFeedback(book);

  return `
    <section class="detail-page">
      <div class="detail-header">
        <button class="button back-button" type="button" data-detail-back aria-label="Back">${icon("back")}</button>
        <span>Book</span>
      </div>
      <section class="book-detail-hero">
        ${bookCover(book, "large")}
        <div>
          <div class="book-title-row">
            <h2>${escapeHtml(book.title)}</h2>
            <span class="rating-badge" aria-label="Reader rating">${icon("rating")}${feedback.rating}</span>
          </div>
          <p>${authorLink(book.author)}</p>
          <span>ISBN ${book.isbn}</span>
          <div class="book-detail-controls">
            ${renderRatingControl(book, "inline")}
            <div class="book-status-field">
              <span>Status</span>
              ${renderBookStatusControl(book, "detail-action")}
            </div>
          </div>
        </div>
      </section>

      ${book.status === "Reading" ? renderBookProgressEditor(book) : ""}
      ${book.status === "Finished" ? renderFinishedDateEditor(book) : ""}
      ${renderBookDetailTabs()}
      ${state.bookDetailTab === "description"
        ? renderBookDescription(book)
        : renderBookFeedback(book, feedback, relatedPosts)}
    </section>
  `;
}

function renderFinishedDateEditor(book) {
  const finishedAt = book.finishedAt || todayIso();
  return `
    <section class="detail-section finished-date-section">
      <article class="finished-date-card">
        <div class="finished-date-row">
          <span>Finished on</span>
          <button class="finished-date-trigger" type="button" data-finished-date-toggle="${escapeHtml(book.title)}" aria-expanded="${state.openFinishedDatePicker === book.title}">
            <span>${escapeHtml(formatDateLabel(finishedAt))}</span>
            ${icon("calendar")}
          </button>
        </div>
        ${state.openFinishedDatePicker === book.title ? renderFinishedDatePicker(book, finishedAt) : ""}
      </article>
    </section>
  `;
}

function renderFinishedDatePicker(book, selectedIso) {
  const monthIso = state.finishedDatePickerMonth || selectedIso.slice(0, 7);
  const [yearRaw, monthRaw] = monthIso.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw) - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const cells = [
    ...Array.from({ length: offset }, (_, index) => ({ id: `finished-empty-${index}`, empty: true })),
    ...Array.from({ length: days }, (_, index) => {
      const day = index + 1;
      const iso = dateIso(year, month, day);
      return { id: iso, day, isToday: iso === todayIso(), isSelected: iso === selectedIso };
    })
  ];

  return `
    <div class="finished-date-picker" data-date-picker-panel>
      <div class="finished-date-picker-head">
        <button type="button" data-finished-date-month="-1" data-finished-date-title="${escapeHtml(book.title)}" aria-label="Previous month">
          ${icon("back")}
        </button>
        <span>${new Date(year, month, 1).toLocaleString("en", { month: "long", year: "numeric" })}</span>
        <button type="button" data-finished-date-month="1" data-finished-date-title="${escapeHtml(book.title)}" aria-label="Next month">
          ${icon("back")}
        </button>
      </div>
      <div class="finished-date-weekdays" aria-hidden="true">
        ${["M", "T", "W", "T", "F", "S", "S"].map((day) => `<span>${day}</span>`).join("")}
      </div>
      <div class="finished-date-grid">
        ${cells.map((cell) => cell.empty
          ? `<span class="finished-date-day empty" aria-hidden="true"></span>`
          : `<button class="finished-date-day ${cell.isToday ? "today" : ""} ${cell.isSelected ? "selected" : ""}" type="button" data-finished-date-value="${cell.id}" data-finished-date-title="${escapeHtml(book.title)}">${cell.day}</button>`
        ).join("")}
      </div>
    </div>
  `;
}

function renderBookDetailTabs() {
  const tabs = [
    { id: "description", label: "Description" },
    { id: "feedback", label: "Feedback" }
  ];

  return `
    <section class="detail-tabs" aria-label="Book details">
      ${tabs.map((tab) => `
        <button class="${state.bookDetailTab === tab.id ? "active" : ""}" type="button" data-book-detail-tab="${tab.id}">
          ${tab.label}
        </button>
      `).join("")}
    </section>
  `;
}

function renderBookDescription(book) {
  return `
    <section class="detail-section">
      <article class="description-card">
        <p>${escapeHtml(book.description || book.note || "No description yet.")}</p>
      </article>
    </section>
  `;
}

function renderBookFeedback(book, feedback, relatedPosts) {
  return `
      <section class="detail-section">
        <div class="section-title compact-title">
          <h2>Reader feedback</h2>
          <button class="button soft-button" type="button" data-feedback-edit="${escapeHtml(book.title)}">
            ${book.myFeedback || book.myRating ? "Edit yours" : "Add yours"}
          </button>
        </div>
        ${state.editingFeedbackBook === book.title ? renderFeedbackForm(book) : ""}
        ${book.myFeedback ? `
          <article class="feedback-card personal-feedback">
            <div>
              <strong>You</strong>
              <span>${escapeHtml(book.myRating || "Saved")}</span>
            </div>
            <p>${escapeHtml(book.myFeedback)}</p>
          </article>
        ` : ""}
        ${feedback.notes.map((note) => `
          <article class="feedback-card">
            <div>
              <strong>${escapeHtml(note.user)}</strong>
              <span>${note.rating}</span>
            </div>
            <p>${escapeHtml(note.text)}</p>
          </article>
        `).join("")}
      </section>

      <section class="detail-section">
        <div class="section-title compact-title">
          <h2>Posts mentioning this book</h2>
          <span>${relatedPosts.length}</span>
        </div>
        ${relatedPosts.length ? relatedPosts.map(renderCompactPost).join("") : `<p class="detail-muted">No posts yet.</p>`}
      </section>
  `;
}

function renderBookProgressEditor(book) {
  const progress = bookProgress(book);
  const format = book.readingFormat || "paper";

  return `
    <section class="detail-section progress-editor">
      <div class="section-title compact-title">
        <h2>Reading progress</h2>
        <span>${progress}%</span>
      </div>
      <div class="progress-card">
        <div class="reading-format-toggle" role="group" aria-label="Reading format">
          <button class="${format === "paper" ? "active" : ""}" type="button" data-reading-format="${escapeHtml(book.title)}" data-reading-format-value="paper">Paper</button>
          <button class="${format === "audio" ? "active" : ""}" type="button" data-reading-format="${escapeHtml(book.title)}" data-reading-format-value="audio">Audiobook</button>
        </div>
        <div class="progress"><i style="${progressStyle(progress)}"></i></div>
        ${format === "audio" ? renderAudioProgressFields(book) : renderPaperProgressFields(book)}
      </div>
    </section>
  `;
}

function renderPaperProgressFields(book) {
  const total = book.totalPages || estimatePages(book);
  const read = Math.max(0, Math.min(total, book.readPages || Math.round(total * ((book.progress || 0) / 100))));

  return `
    <label>
      <span>Pages read</span>
      <input type="number" min="0" max="${total}" value="${read}" data-pages-read="${escapeHtml(book.title)}">
      <small>of ${total} pages</small>
    </label>
  `;
}

function renderAudioProgressFields(book) {
  const total = book.totalMinutes || estimateAudioMinutes(book);
  const listened = Math.max(0, Math.min(total, book.listenedMinutes || 0));
  const listenedParts = durationParts(listened);
  const totalParts = durationParts(total);

  return `
    <div class="audio-progress-fields" data-audio-progress="${escapeHtml(book.title)}">
      <span>Time listened</span>
      <label>
        <input type="number" min="0" value="${listenedParts.hours}" data-audio-listened-hours="${escapeHtml(book.title)}">
        <small>h</small>
      </label>
      <label>
        <input type="number" min="0" max="59" value="${listenedParts.minutes}" data-audio-listened-minutes-part="${escapeHtml(book.title)}">
        <small>m</small>
      </label>
      <span>Duration</span>
      <label>
        <input type="number" min="0" value="${totalParts.hours}" data-audio-total-hours="${escapeHtml(book.title)}">
        <small>h</small>
      </label>
      <label>
        <input type="number" min="0" max="59" value="${totalParts.minutes}" data-audio-total-minutes="${escapeHtml(book.title)}">
        <small>m</small>
      </label>
    </div>
  `;
}

function renderFeedbackForm(book) {
  return `
    <section class="detail-section feedback-form-section">
      <div class="section-title compact-title">
        <h2>Your feedback</h2>
        <span>${book.myRating ? book.myRating : "Optional"}</span>
      </div>
      <form class="feedback-form" data-feedback-form="${escapeHtml(book.title)}">
        ${renderRatingControl(book, "form")}
        <label>
          <span>Feedback</span>
          <textarea name="feedback" rows="3" placeholder="What did this book leave you with?">${escapeHtml(book.myFeedback || "")}</textarea>
        </label>
        <button class="button button-fill" type="submit">${book.myFeedback || book.myRating ? "Update feedback" : "Save feedback"}</button>
      </form>
    </section>
  `;
}

function renderAuthorPage(author) {
  const authorBooks = books.filter((book) => book.author === author);

  return `
    <section class="detail-page">
      <div class="detail-header">
        <button class="button back-button" type="button" data-detail-back aria-label="Back">${icon("back")}</button>
        <span>Author</span>
      </div>
      <section class="author-hero">
        <p class="section-kicker">Author</p>
        <h2>${escapeHtml(author)}</h2>
        <p>${authorBooks.length} ${authorBooks.length === 1 ? "book" : "books"} we know about.</p>
      </section>
      <section class="library-list">
        ${authorBooks.map((book) => `
          <article class="library-item">
            ${bookCover(book)}
            <div>
              <h3>${bookLink(book.title)}</h3>
              <p>${bookCardMeta(book)}</p>
              ${renderShelfProgress(book)}
            </div>
            ${renderBookStatusControl(book, "shelf-status")}
          </article>
        `).join("")}
      </section>
    </section>
  `;
}

function renderCompactPost(post) {
  return `
    <article class="compact-post">
      ${avatar(post)}
      <div>
        <h3>${escapeHtml(post.user)}</h3>
        <p>${bookLink(post.book, "post-book-title")} ${escapeHtml(post.text)}</p>
      </div>
    </article>
  `;
}

function bookFeedback(book) {
  if (book.communityRating) {
    return {
      rating: book.communityRating,
      notes: [
        {
          user: "Open Library",
          rating: book.communityRating,
          text: book.ratingsCount ? `Based on ${book.ratingsCount} reader ratings.` : "Reader rating from Open Library."
        }
      ]
    };
  }

  const presets = {
    "Pride and Prejudice": {
      rating: "4.8",
      notes: [
        { user: "Mila", rating: "5.0", text: "Sharp, funny, and still absurdly comforting." },
        { user: "Anya", rating: "4.6", text: "Perfect when you want drama that smiles politely." }
      ]
    },
    Frankenstein: {
      rating: "4.5",
      notes: [
        { user: "Lera", rating: "4.7", text: "A strange, lonely book in the best way." },
        { user: "Mila", rating: "4.3", text: "More tender than I expected, much darker than it looks." }
      ]
    },
    "Little Women": {
      rating: "4.7",
      notes: [
        { user: "Anya", rating: "4.8", text: "Warm, dramatic, and full of tiny heartbreaks." },
        { user: "You", rating: "4.6", text: "Feels like opening a window in a familiar room." }
      ]
    },
    "Jane Eyre": {
      rating: "4.6",
      notes: [
        { user: "Lera", rating: "4.9", text: "Gothic feelings, stubborn heroine, excellent storm energy." },
        { user: "Mila", rating: "4.4", text: "Messy and magnetic in exactly the right way." }
      ]
    }
  };

  return presets[book.title] || {
    rating: "New",
    notes: [
      { user: "Readers", rating: "New", text: "No reader notes yet. This title was just added." }
    ]
  };
}

function renderMissingDetail(label) {
  return `
    <section class="detail-page">
      <div class="detail-header">
        <button class="button back-button" type="button" data-detail-back aria-label="Back">${icon("back")}</button>
        <span>${label}</span>
      </div>
      <div class="add-empty">
        <h2>${label} not found</h2>
        <p>It may have been removed from the local book list.</p>
      </div>
    </section>
  `;
}

function renderManualBookForm() {
  const authors = [...new Set(books.map((book) => book.author))];

  return `
    <section class="manual-book-page">
      <div class="compose-page-header">
        <button class="button back-button" type="button" data-add-manual-back aria-label="Back">${icon("back")}</button>
        <h2>Add custom book</h2>
        <span aria-hidden="true"></span>
      </div>
      <form class="manual-book-form" data-manual-book-form>
      <div class="manual-cover-preview">
        <img src="${CUSTOM_COVER_PLACEHOLDER}" alt="Custom book cover preview" data-manual-cover-preview>
        <div>
          <p>Add a cover photo if you have one. If not, we will use a simple placeholder for now.</p>
          <label class="photo-upload-field">
            <span>Choose cover</span>
            <input name="cover" type="file" accept="image/*" data-manual-cover>
          </label>
        </div>
      </div>
      <label>
        <span>Title</span>
        <input name="title" type="text" placeholder="Book title" required>
      </label>
      <label>
        <span>Author</span>
        <input name="author" type="text" list="author-suggestions" placeholder="Author name" required>
        <datalist id="author-suggestions">
          ${authors.map((author) => `<option value="${escapeHtml(author)}"></option>`).join("")}
        </datalist>
      </label>
      <label>
        <span>ISBN</span>
        <input name="isbn" type="text" placeholder="Optional">
      </label>
      <button class="button button-fill" type="submit">Add title</button>
      </form>
    </section>
  `;
}

function renderComposePage() {
  const previewBook = composeSelectedBook() || books[0];
  return `
    <section class="compose-page">
      <div class="compose-page-header">
        <button class="button back-button" type="button" data-compose-cancel aria-label="Back">${icon("back")}</button>
        <h2>Share a reading moment</h2>
        <span aria-hidden="true"></span>
      </div>
      <form class="compose-card" data-compose-form>
      <label class="book-search-field">
        <span>Book</span>
        <input name="book" type="search" placeholder="Search title or author" autocomplete="off" data-compose-book value="${escapeHtml(state.composeBookQuery)}">
      </label>
      ${renderComposeBookSuggestions()}
      <div class="compose-preview" data-compose-preview>
        <img src="${previewBook.cover}" alt="Post preview">
        <div>
          <p>Default: book cover. Or add a personal photo.</p>
          <label class="photo-upload-field">
            <span>Choose photo</span>
            <input name="photo" type="file" accept="image/*" data-compose-photo>
          </label>
        </div>
      </div>
      <label>
        <span>Caption</span>
        <textarea name="text" rows="2" placeholder="What did this book feel like today?"></textarea>
      </label>
      <div class="compose-actions">
        <button class="button" type="button" data-compose-cancel>Cancel</button>
        <button class="button button-fill" type="submit">Post</button>
      </div>
      </form>
    </section>
  `;
}

function composeBookSuggestions() {
  const query = state.composeBookQuery.trim().toLowerCase();
  if (!query) return [];

  const local = books.filter((book) =>
    book.title.toLowerCase().includes(query)
    || book.author.toLowerCase().includes(query)
  );
  const seen = new Set(local.map((book) => book.title.toLowerCase()));
  const remote = state.composeBookResults.filter((book) => !seen.has(book.title.toLowerCase()));
  return [...local, ...remote].slice(0, 5);
}

function composeSelectedBook() {
  const normalized = state.composeBookQuery.trim().toLowerCase();
  if (!normalized) return null;
  return books.find((book) => book.title.toLowerCase() === normalized)
    || state.composeBookResults.find((book) => book.title.toLowerCase() === normalized)
    || composeBookSuggestions()[0]
    || null;
}

function renderComposeBookSuggestions() {
  const suggestions = composeBookSuggestions();
  if (!state.composeBookQuery.trim() || state.composeBookSelected) return "";

  if (state.composeBookStatus === "loading" && !suggestions.length) {
    return `<div class="compose-book-suggestions"><p>Searching books...</p></div>`;
  }

  if (!suggestions.length) {
    return `<div class="compose-book-suggestions"><p>No matches yet.</p></div>`;
  }

  return `
    <div class="compose-book-suggestions">
      ${suggestions.map((book) => `
        <button type="button" data-compose-book-pick="${escapeHtml(book.title)}">
          <img src="${book.cover}" alt="${escapeHtml(book.title)} cover" loading="lazy">
          <span>
            <strong>${escapeHtml(book.title)}</strong>
            <small>${escapeHtml(book.author)}</small>
          </span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderEmptyFeed() {
  return `
    <section class="empty-feed">
      <h2>No posts found</h2>
      <p>Try another title or switch back to All.</p>
    </section>
  `;
}

function renderPost(post) {
  const liked = state.liked.has(post.id);
  const saved = state.saved.has(post.id);
  const expanded = state.expandedPosts.has(post.id);
  const postText = renderPostText(post, expanded);

  return `
    <article class="post-card">
      <div class="post-author">
        ${avatar(post)}
        <div>
          <h3>${post.user}</h3>
          <p>${post.handle} · ${post.mood}</p>
        </div>
      </div>
      <div class="post-image" style="background:${post.image}">
        ${post.photo
          ? `<img class="post-photo" src="${post.photo}" alt="${post.book} reading moment" loading="lazy">`
          : `<div class="photo-book">
              <img src="${post.cover}" alt="${post.book} cover" loading="lazy">
            </div>`
        }
      </div>
      <div class="post-actions">
        <button class="${liked ? "active" : ""}" data-like="${post.id}" aria-label="Like">${icon("heart")}</button>
        <button aria-label="Comments">${icon("message")}</button>
        <button class="${saved ? "active" : ""}" data-save="${post.id}" aria-label="Save">${icon("bookmark")}</button>
      </div>
      <p class="post-meta">${post.likes + (liked ? 1 : 0)} likes · ${post.comments} comments</p>
      ${renderPostBookRow(post)}
      <p class="post-text">${postText}</p>
    </article>
  `;
}

function renderPostBookRow(post) {
  const book = findBook(post.book);
  const added = book && readingStatuses.includes(book.status);

  return `
    <div class="post-book-row">
      ${bookLink(post.book, "post-book-title")}
      ${added
        ? `<span class="post-book-state">${book.status === "Reading" ? "Reading now" : book.status}</span>`
        : `<button class="post-wishlist-button" type="button" data-book-status-quick="${escapeHtml(post.book)}" data-book-status-value="Wishlist" aria-label="Add ${escapeHtml(post.book)} to wishlist">${icon("plus")}</button>`}
    </div>
  `;
}

function renderPostText(post, expanded) {
  const control = `<button class="post-more" data-post-more="${post.id}">${expanded ? "Less" : "More"}</button>`;

  return `<span class="post-copy ${expanded ? "expanded" : ""}" data-post-copy="${post.id}">${escapeHtml(post.text)}</span>${control}`;
}

function syncPostMoreControls() {
  document.querySelectorAll("[data-post-copy]").forEach((copy) => {
    const button = document.querySelector(`[data-post-more="${copy.dataset.postCopy}"]`);
    if (!button || copy.classList.contains("expanded")) return;

    const overflows = copy.scrollHeight > copy.clientHeight + 1;
    button.hidden = !overflows;
  });
}

function bookLink(title, className = "") {
  return `<button class="text-link ${className}" type="button" data-book-open="${escapeHtml(title)}">${escapeHtml(title)}</button>`;
}

function authorLink(author) {
  return `<button class="text-link author-link" type="button" data-author-open="${escapeHtml(author)}">${escapeHtml(author)}</button>`;
}

function bookCover(book, size = "") {
  const label = `Open ${book.title}`;

  return `
    <button class="book-cover ${size}" type="button" data-book-open="${escapeHtml(book.title)}" aria-label="${escapeHtml(label)}">
      <img src="${book.cover}" alt="${book.title} cover" loading="lazy" onerror="this.onerror=null;this.src='${CUSTOM_COVER_PLACEHOLDER}'">
    </button>
  `;
}

function progressStyle(value) {
  const percent = Math.max(0, Math.min(100, value));
  return `width:${percent}%; background:${progressColor(percent)}`;
}

function progressColor(percent) {
  const start = [255, 248, 221];
  const end = [118, 169, 70];
  const mix = percent / 100;
  const color = start.map((channel, index) => Math.round(channel + (end[index] - channel) * mix));
  return `rgb(${color.join(", ")})`;
}

function avatar(person) {
  if (person.avatarImage) {
    return `
      <span class="avatar">
        <img src="${person.avatarImage}" alt="${person.user} profile photo" loading="lazy">
      </span>
    `;
  }

  return `<span class="avatar">${person.avatar}</span>`;
}

function bindEvents() {
  const content = document.querySelector(".content");
  if (content) {
    content.addEventListener("scroll", () => {
      state.contentScrollTop = content.scrollTop;
    });
  }

  app.onclick = (event) => {
    if (!state.openStatusMenu || event.target.closest(".book-status-control")) return;
    state.openStatusMenu = "";
    state.openStatusMenuDirection = "down";
    render({ preserveScroll: true });
  };

  document.querySelectorAll("[data-book-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailPage = { type: "book", value: button.dataset.bookOpen };
      state.bookDetailTab = "description";
      state.addingBook = false;
      state.composing = false;
      const book = findBook(button.dataset.bookOpen);
      if (book) enrichAndRender(book);
      render();
    });
  });

  document.querySelectorAll("[data-book-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.bookDetailTab = button.dataset.bookDetailTab;
      state.editingFeedbackBook = "";
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-author-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailPage = { type: "author", value: button.dataset.authorOpen };
      state.addingBook = false;
      state.composing = false;
      render();
    });
  });

  document.querySelectorAll("[data-detail-back]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailPage = null;
      render();
    });
  });

  document.querySelectorAll("[data-book-status-quick]").forEach((button) => {
    button.addEventListener("click", () => {
      const scrollTop = state.contentScrollTop || document.querySelector(".content")?.scrollTop || 0;
      const book = setBookStatus(
        button.dataset.bookStatusQuick,
        button.dataset.bookStatusValue,
        button.dataset.bookStatusKey || ""
      );
      state.openStatusMenu = "";
      state.openStatusMenuDirection = "down";
      if (book) enrichAndRender(book, { preserveScroll: true, scrollTop });
      render({ preserveScroll: true, scrollTop });
    });
  });

  document.querySelectorAll("[data-book-status-menu]").forEach((button) => {
    button.addEventListener("click", () => {
      const isClosing = state.openStatusMenu === button.dataset.bookStatusMenu;
      state.openStatusMenu = isClosing ? "" : button.dataset.bookStatusMenu;
      state.openStatusMenuDirection = isClosing ? "down" : statusMenuDirection(button);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-book-status-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const scrollTop = state.contentScrollTop || document.querySelector(".content")?.scrollTop || 0;
      const book = setBookStatus(
        button.dataset.bookStatusChoice,
        button.dataset.bookStatusValue,
        button.dataset.bookStatusKey || ""
      );
      state.openStatusMenu = "";
      state.openStatusMenuDirection = "down";
      if (book) enrichAndRender(book, { preserveScroll: true, scrollTop });
      render({ preserveScroll: true, scrollTop });
    });
  });

  document.querySelectorAll("[data-remove-book-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      state.openStatusMenu = "";
      state.openStatusMenuDirection = "down";
      state.removeBookPrompt = button.dataset.removeBookPrompt;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-remove-book-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.removeBookPrompt = "";
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-remove-book-confirm]").forEach((button) => {
    button.addEventListener("click", () => {
      removeBookFromLibrary(button.dataset.removeBookConfirm);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-pages-read]").forEach((input) => {
    input.addEventListener("change", () => {
      updateBookPages(input.dataset.pagesRead, Number(input.value || 0));
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-reading-format]").forEach((button) => {
    button.addEventListener("click", () => {
      updateReadingFormat(button.dataset.readingFormat, button.dataset.readingFormatValue);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-audio-progress]").forEach((group) => {
    group.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        const title = group.dataset.audioProgress;
        const listened = minutesFromParts(
          group.querySelector("[data-audio-listened-hours]")?.value,
          group.querySelector("[data-audio-listened-minutes-part]")?.value
        );
        const total = minutesFromParts(
          group.querySelector("[data-audio-total-hours]")?.value,
          group.querySelector("[data-audio-total-minutes]")?.value
        );
        updateAudioProgress(title, listened, total);
        render({ preserveScroll: true });
      });
    });
  });

  document.querySelectorAll("[data-finished-date-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.dataset.finishedDateToggle;
      const book = findBook(title);
      const isOpen = state.openFinishedDatePicker === title;
      state.openFinishedDatePicker = isOpen ? "" : title;
      state.finishedDatePickerMonth = isOpen ? "" : (book?.finishedAt || todayIso()).slice(0, 7);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-finished-date-month]").forEach((button) => {
    button.addEventListener("click", () => {
      state.openFinishedDatePicker = button.dataset.finishedDateTitle;
      state.finishedDatePickerMonth = shiftMonthIso(state.finishedDatePickerMonth || todayIso().slice(0, 7), Number(button.dataset.finishedDateMonth));
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-finished-date-value]").forEach((button) => {
    button.addEventListener("click", () => {
      updateFinishedDate(button.dataset.finishedDateTitle, button.dataset.finishedDateValue);
      state.openFinishedDatePicker = "";
      state.finishedDatePickerMonth = "";
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-reading-calendar-month]").forEach((button) => {
    button.addEventListener("click", () => {
      state.readingCalendarMonth = shiftMonthIso(state.readingCalendarMonth || monthIsoFromDate(new Date()), Number(button.dataset.readingCalendarMonth));
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-current-reading-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const readingCount = books.filter((book) => book.status === "Reading").length;
      if (!readingCount) return;
      const step = Number(button.dataset.currentReadingStep);
      state.currentReadingIndex = (state.currentReadingIndex + step + readingCount) % readingCount;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-finish-reading]").forEach((button) => {
    button.addEventListener("click", () => {
      setBookStatus(button.dataset.finishReading, "Finished");
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-feedback-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingFeedbackBook = state.editingFeedbackBook === button.dataset.feedbackEdit ? "" : button.dataset.feedbackEdit;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-rating-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const book = findBook(button.dataset.ratingStep);
      const current = Number(book?.myRating || 0);
      const next = current ? current + Number(button.dataset.ratingDelta) : Number(button.dataset.ratingDelta) > 0 ? 0.5 : 0;
      setBookRating(button.dataset.ratingStep, next);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-feedback-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const rating = findBook(form.dataset.feedbackForm)?.myRating || "";
      const text = `${data.get("feedback") || ""}`.trim();
      saveBookFeedback(form.dataset.feedbackForm, rating, text);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-feedback-skip]").forEach((button) => {
    button.addEventListener("click", () => {
      state.feedbackPromptBook = "";
      state.feedbackPromptPrevious = null;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-feedback-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      cancelFinishedPrompt();
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-add-book-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.addingBook = true;
      state.detailPage = null;
      state.composing = false;
      render();
    });
  });

  document.querySelectorAll("[data-rail-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const rail = document.getElementById(button.dataset.railScroll);
      if (!rail) return;
      rail.scrollBy({
        left: Number(button.dataset.railDirection) * Math.max(rail.clientWidth * 0.72, 220),
        behavior: "smooth"
      });
    });
  });

  document.querySelectorAll("[data-add-book-close]").forEach((button) => {
    button.addEventListener("click", () => {
      state.addingBook = false;
      state.addBookQuery = "";
      state.remoteBookResults = [];
      state.remoteBookStatus = "idle";
      state.manualBookPage = false;
      render();
    });
  });

  document.querySelectorAll("[data-add-book-search]").forEach((input) => {
    input.addEventListener("input", () => {
      state.addBookQuery = input.value;
      queueRemoteBookSearch(state.addBookQuery);
      if (!state.addBookQuery.trim()) {
        state.manualBookPage = false;
      }
      render({
        preserveScroll: true,
        persist: false,
        focus: {
          selector: "[data-add-book-search]",
          start: input.selectionStart,
          end: input.selectionEnd
        }
      });
    });
  });

  document.querySelectorAll("[data-add-manual]").forEach((button) => {
    button.addEventListener("click", () => {
      state.addingBook = true;
      state.manualBookPage = true;
      render();
    });
  });

  document.querySelectorAll("[data-add-manual-back]").forEach((button) => {
    button.addEventListener("click", () => {
      state.manualBookPage = false;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-manual-cover]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const preview = document.querySelector("[data-manual-cover-preview]");
        if (preview) preview.src = reader.result;
      });
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll("[data-manual-book-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const title = `${data.get("title") || ""}`.trim();
      const author = `${data.get("author") || ""}`.trim();
      const isbn = `${data.get("isbn") || ""}`.trim() || "Custom";
      const cover = form.elements.cover.files[0];

      if (!title || !author) return;

      const addBook = (coverUrl) => {
        books = [
          {
            title,
            author,
            isbn,
            cover: coverUrl || CUSTOM_COVER_PLACEHOLDER,
            status: "",
            totalPages: 320,
            readPages: 0,
            progress: 0,
            description: "No description yet.",
            note: "Added manually."
          },
          ...books
        ];
        state.manualBookPage = false;
        state.addBookQuery = title;
        render();
      };

      if (cover) {
        const reader = new FileReader();
        reader.addEventListener("load", () => addBook(reader.result));
        reader.readAsDataURL(cover);
      } else {
        addBook(null);
      }
    });
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.addingBook = false;
      state.manualBookPage = false;
      state.detailPage = null;
      state.tab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-like]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSet(state.liked, button.dataset.like);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-save]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSet(state.saved, button.dataset.save);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-post-more]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSet(state.expandedPosts, button.dataset.postMore);
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-compose-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.composing = true;
      state.composeBookQuery = "";
      state.composeBookResults = [];
      state.composeBookStatus = "idle";
      state.composeBookSelected = false;
      render();
    });
  });

  document.querySelectorAll("[data-compose-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.composing = false;
      state.composeBookSelected = false;
      render();
    });
  });

  document.querySelectorAll("[data-feed-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.feedFilter = button.dataset.feedFilter;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-feed-book]").forEach((button) => {
    button.addEventListener("click", () => {
      state.feedQuery = button.dataset.feedBook;
      state.feedSearchText = button.dataset.feedBook;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-feed-search-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      state.feedQuery = "";
      state.feedSearchText = "";
      render({ preserveScroll: true, persist: false });
    });
  });

  document.querySelectorAll("[data-feed-search]").forEach((input) => {
    input.addEventListener("input", () => {
      state.feedSearchText = input.value;
      if (!input.value.trim()) {
        state.feedQuery = "";
      }
      render({
        preserveScroll: true,
        persist: false,
        focus: {
          selector: "[data-feed-search]",
          start: input.selectionStart,
          end: input.selectionEnd
        }
      });
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      const typed = input.value.trim().toLowerCase();
      const match = feedBookOptions().find((title) => title.toLowerCase() === typed) || feedSuggestions()[0];
      if (match) {
        state.feedQuery = match;
        state.feedSearchText = match;
        render({ preserveScroll: true, persist: false, focus: "[data-feed-search]" });
      }
    });
  });

  document.querySelectorAll("[data-compose-book]").forEach((input) => {
    input.addEventListener("input", () => {
      state.composeBookQuery = input.value;
      state.composeBookSelected = false;
      queueComposeBookSearch(state.composeBookQuery);
      const preview = document.querySelector(".compose-preview img");
      const matchedBook = composeSelectedBook() || books[0];
      if (preview) preview.src = matchedBook.cover;
      render({
        preserveScroll: true,
        persist: false,
        focus: {
          selector: "[data-compose-book]",
          start: input.selectionStart,
          end: input.selectionEnd
        }
      });
    });
  });

  document.querySelectorAll("[data-compose-book-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      state.composeBookQuery = button.dataset.composeBookPick;
      state.composeBookStatus = "done";
      state.composeBookSelected = true;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-compose-photo]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const preview = document.querySelector(".compose-preview img");
        if (preview) preview.src = reader.result;
      });
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll("[data-compose-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const typedTitle = `${data.get("book") || ""}`.trim();
      const selectedBook = ensureKnownBook(composeSelectedBook() || findBook(typedTitle) || books[0]);
      enrichOpenLibraryBook(selectedBook).then(persistLocalData);
      const photo = form.elements.photo.files[0];
      const text = `${data.get("text") || ""}`.trim() || "Sharing this from my reading corner.";
      const id = `user-post-${Date.now()}`;
      const addPost = (photoUrl) => {
        const post = {
          id,
          user: state.authUser ? userDisplayName() : "You",
          handle: state.authUser?.email ? `@${state.authUser.email.split("@")[0]}` : "@my.pockland",
          avatar: "Y",
          avatarImage: userAvatarUrl(),
          mood: "just now",
          image: selectedBook.title === "Frankenstein"
            ? "linear-gradient(135deg, #dff5ff 0%, #94c86c 46%, #ffe27a 100%)"
            : "linear-gradient(135deg, #9fd7ef 0%, #fff1a8 48%, #8bbf5e 100%)",
          book: selectedBook.title,
          cover: selectedBook.cover,
          photo: photoUrl,
          text,
          likes: 0,
          comments: 0
        };
        if (state.authUser) {
          savePublicPost(state.authUser.id, post)
            .then((savedPost) => {
              state.remotePosts = mergePosts([savedPost], state.remotePosts);
              render({ preserveScroll: true });
            })
            .catch(() => {
              state.userPosts.unshift(post);
              render({ preserveScroll: true });
            });
        } else {
          state.userPosts.unshift(post);
        }
        state.composing = false;
        state.composeBookQuery = "";
        state.composeBookResults = [];
        state.composeBookStatus = "idle";
        state.composeBookSelected = false;
        render();
      };

      if (photo) {
        const reader = new FileReader();
        reader.addEventListener("load", () => addPost(reader.result));
        reader.readAsDataURL(photo);
      } else {
        addPost(null);
      }
    });
  });

  document.querySelectorAll("[data-shelf]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentShelf = button.dataset.shelf;
      state.currentCustomShelf = null;
      render();
    });
  });

  document.querySelectorAll("[data-shelf-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.shelfMode = button.dataset.shelfMode;
      state.creatingShelf = false;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-custom-shelf-create]").forEach((button) => {
    button.addEventListener("click", () => {
      state.creatingShelf = !state.creatingShelf;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-custom-shelf-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = `${data.get("name") || ""}`.trim();
      if (!name) return;

      const id = `custom-${Date.now()}`;
      customShelves = [
        {
          id,
          name,
          description: "A personal shelf you can fill from All.",
          bookTitles: []
        },
        ...customShelves
      ];
      state.currentCustomShelf = null;
      state.detailPage = { type: "customShelf", value: id };
      state.creatingShelf = false;
      persistLocalData();
      render();
    });
  });

  document.querySelectorAll("[data-custom-shelf-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailPage = { type: "customShelf", value: button.dataset.customShelfOpen };
      state.creatingShelf = false;
      render();
    });
  });

  document.querySelectorAll("[data-custom-shelf-close]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentCustomShelf = null;
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll("[data-custom-shelf-book]").forEach((button) => {
    button.addEventListener("click", () => {
      const shelf = customShelves.find((item) => item.id === button.dataset.customShelfBook);
      const title = button.dataset.customShelfBookTitle;
      if (!shelf || !title) return;

      if (shelf.bookTitles.includes(title)) {
        shelf.bookTitles = shelf.bookTitles.filter((bookTitle) => bookTitle !== title);
      } else {
        shelf.bookTitles = [...shelf.bookTitles, title];
      }
      persistLocalData();
      render({ preserveScroll: true });
    });
  });

  document.querySelectorAll(".theme-switch [data-theme]").forEach((button) => {
    button.addEventListener("click", () => {
      state.theme = button.dataset.theme;
      localStorage.setItem("book-nook-theme", state.theme);
      persistLocalData();
      render();
    });
  });

  document.querySelectorAll("[data-auth-google]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.authStatus = "loading";
      render({ preserveScroll: true });
      try {
        await signInWithGoogle();
      } catch {
        state.authStatus = "error";
        render({ preserveScroll: true });
      }
    });
  });

  document.querySelectorAll("[data-auth-signout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await signOut();
      } catch {
        state.syncStatus = "error";
        render({ preserveScroll: true });
      }
    });
  });
}

function toggleSet(set, value) {
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
}

function findBook(title) {
  const normalized = title.toLowerCase();
  return books.find((book) => book.title.toLowerCase() === normalized)
    || state.remoteBookResults.find((book) => book.title.toLowerCase() === normalized)
    || state.composeBookResults.find((book) => book.title.toLowerCase() === normalized)
    || homeDiscoveryBooks().find((book) => book.title.toLowerCase() === normalized)
    || books.find((book) => normalized.length > 1 && book.title.toLowerCase().includes(normalized));
}

function ensureKnownBook(book) {
  const existing = books.find((item) => item.title.toLowerCase() === book.title.toLowerCase());
  if (existing) {
    Object.entries(book).forEach(([key, value]) => {
      if ((existing[key] === undefined || existing[key] === "" || existing[key] === "No description yet.") && value) {
        existing[key] = value;
      }
    });
    return existing;
  }
  const nextBook = { ...book, status: book.status || "" };
  books = [nextBook, ...books];
  return nextBook;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

removeLegacyPwaCache();
render();
bootstrapBackend();
