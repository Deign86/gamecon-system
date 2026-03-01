/**
 * Vitest global test setup.
 *
 * - Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Mocks Firebase SDK modules so tests never hit real Firebase services
 * - Provides global DOM cleanup between tests
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/* ── Auto-cleanup after each test ── */
afterEach(() => {
  cleanup();
});

/* ── Mock import.meta.env (Vite) ── */
// Vitest handles import.meta.env automatically — set defaults here
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  import.meta.env.VITE_FIREBASE_API_KEY = "test-api-key";
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
  import.meta.env.VITE_FIREBASE_PROJECT_ID = "test-project";
  import.meta.env.VITE_FIREBASE_STORAGE_BUCKET = "test.appspot.com";
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID = "123456";
  import.meta.env.VITE_FIREBASE_APP_ID = "1:123:web:abc";
}

/* ── Mock Firebase App ── */
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "[DEFAULT]", options: {} })),
}));

/* ── Mock Firebase Auth ── */
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_, cb) => {
    // Default: no user signed in
    cb(null);
    return vi.fn(); // unsubscribe
  }),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

/* ── Mock Firebase Firestore ── */
vi.mock("firebase/firestore", () => ({
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => ({ _type: "serverTimestamp" })),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

/* ── Mock Firebase Functions ── */
vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

/* ── Mock Firebase Messaging (optional in tests) ── */
vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
}));

/* ── Mock src/firebase.js so components get stable references ── */
vi.mock("../firebase", () => ({
  default: { name: "[DEFAULT]", options: {} },
  auth: {},
  db: {},
  functions: {},
}));

/* ── Mock Framer Motion to avoid animation timing issues ── */
vi.mock("motion/react", () => {
  const React = require("react");
  const createMotionComponent = (tag) => {
    const Component = React.forwardRef((props, ref) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, whileFocus, whileInView,
        layout, layoutId, onAnimationComplete,
        ...htmlProps
      } = props;
      return React.createElement(tag, { ...htmlProps, ref });
    });
    Component.displayName = `motion.${tag}`;
    return Component;
  };
  const tags = ["div", "span", "button", "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img", "ul", "li", "form", "input", "label", "section", "nav", "header",
    "footer", "main", "aside", "article", "svg", "path", "circle", "rect"];
  const motion = {};
  tags.forEach((t) => { motion[t] = createMotionComponent(t); });
  return {
    motion,
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => true,
  };
});

/* ── Mock lucide-react (icon library) ── */
vi.mock("lucide-react", () => {
  const React = require("react");
  const makeIcon = (name) => {
    const Icon = (props) => React.createElement("svg", { "data-testid": `icon-${name}`, ...props });
    Icon.displayName = name;
    return Icon;
  };
  // Export all commonly used icons by name
  const icons = [
    "X", "Check", "CheckCircle", "AlertCircle", "AlertTriangle", "XCircle",
    "Info", "Eye", "EyeOff", "LogIn", "LogOut", "Search", "Plus", "Minus",
    "ChevronDown", "ChevronUp", "ChevronLeft", "ChevronRight", "ArrowLeft",
    "ArrowRight", "Menu", "Settings", "User", "Users", "Trash2", "Edit",
    "Download", "Upload", "Clock", "Calendar", "MapPin", "Gamepad2", "Ticket",
    "Shield", "ShieldCheck", "Bell", "BellOff", "Copy", "ExternalLink", "RotateCcw",
    "MoreVertical", "MoreHorizontal", "Filter", "RefreshCw", "Save",
    "Loader2", "Wifi", "WifiOff", "Sun", "Moon", "Monitor",
  ];
  const mod = { __esModule: true };
  icons.forEach((name) => { mod[name] = makeIcon(name); });
  return mod;
});

/* ── Mock react-router-dom ── */
vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: () => null,
  Link: ({ children, ...props }) => require("react").createElement("a", props, children),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/", search: "", hash: "" }),
  useParams: () => ({}),
}));

/* ── Mock @vercel/analytics ── */
vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

/* ── Mock IntersectionObserver (not available in jsdom) ── */
if (typeof IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/* ── Mock matchMedia ── */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/* ── Mock HTMLMediaElement methods (jsdom omits them) ── */
if (typeof window !== "undefined") {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
}
