import ContactUs from "views/ContactUs/ContactUs";
import Dashboard from "views/Dashboard/Dashboard";
import Deposit from "views/Deposit/Deposit";
import Faq from "views/Faq/Faq";
import Partnership from "views/Partnership/Partnership";
import Profile from "views/Profile/Profile";
import Withdraw from "views/Withdraw/Withdraw";

import SignIn from "views/Auth/SignIn";
import SignUp from "views/Auth/SignUp";
import TwoFa from "views/Auth/TwoFa";
import ForgotPassword from "views/Auth/ForgotPassword";

import tierA from "assets/badge/tierA.png";
import tierB from "assets/badge/tierB.png";
import tierC from "assets/badge/tierC.png";

import Bet from "views/Bet/Bet";

import PrivacyPolicy from "views/Legal/PrivacyPolicy";
import UserAgreement from "views/Legal/UserAgreement";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WindowIcon from '@mui/icons-material/Window';
import HelpIcon from '@mui/icons-material/Help';
import PixIcon from '@mui/icons-material/Pix';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ContactsIcon from '@mui/icons-material/Contacts';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CloudDownloadRoundedIcon from '@mui/icons-material/CloudDownloadRounded';
import CasinoIcon from '@mui/icons-material/Casino';
import TwitterIcon from '@mui/icons-material/Twitter';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import DiamondIcon from '@mui/icons-material/Diamond';
import NumbersIcon from '@mui/icons-material/Numbers';
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import SupportPage from "views/Support/Support";
import GavelIcon from '@mui/icons-material/Gavel';
import DangerousIcon from '@mui/icons-material/Dangerous';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import StyleIcon from '@mui/icons-material/Style';
import AppsIcon from '@mui/icons-material/Apps';

import Landing from "views/Landing/Landing"
import RubicPage from "views/Rubic/RubicPage"
import PumpingPage from "views/Pumping/PumpingPage"
import GravityPage from "views/Gravity/GravityPage"
import DoublePage from "views/Double/DoublePage"
import CloudSpreadPage from "views/CloudSpread/CloudSpreadPage";
import FishingPage from "views/Fishing/FishingPage";
import CardGamePage from "views/CardGame/CardGamePage";
import JokerCrashPage from "views/JokerCrash/JokerCrashPage";
import GamesIcon from '@mui/icons-material/Games';
import Dove from "views/DovePage/Dove";
import MinesPage from "views/Mines/MinesPage";
import AlphaTreePage from "views/AlphaTree/AlphaTree";
import CoinPage from "views/Coin/CoinPage";
import DicePage from "views/Dice/DicePage";
import KenoPage from "views/Keno/KenoPage";

import Mining from "views/Mining/Mining";
import RocketShotPage from "views/RocketShot/RocketShot"
import AttractionsIcon from '@mui/icons-material/Attractions';
import Coco from "views/Coco/CocoPage";
import { GiChicken, GiFishingHook } from "react-icons/gi";
import AToZPage from "views/AToZ/AToZ";
import ForestIcon from '@mui/icons-material/Forest';
import Filter9Icon from '@mui/icons-material/Filter9';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TwistPage from "views/Twist/TwistPage";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import WheelPage from "views/Wheel/Wheel";
import ClimbPage from "views/Climb/ClimbPage";

import {
  DocumentIcon,
  PersonIcon,
  RocketIcon,
} from "components/Icons/Icons";

var dashRoutes = [
  {
    redirect: true,
    path: "/landing",
    name: "Landing",
    component: Landing,
    layout: "/auth",
  },
  {
    path: "/dashboard",
    name: "DASHBOARD",
    icon: <WindowIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Dashboard,
    layout: "/user",
  },
  {
    name: "LOTTERY",
    icon: <HandshakeIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    layout: "/admin",
  },
  {
    path: "/affiliation",
    name: "AFFILIATION",
    icon: <HandshakeIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Partnership,
    layout: "/user",
  },
  // {
  //   name: "LOTTERY",
  //   icon: <CasinoIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
  // },
  {
    name: "NUMEXA",
    icon: <PixIcon style={{ fontSize: "24px", color: "#00D4FF" }} />
  },
  {
    name: "GAMES",
    icon: <GamesIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
  },
  {
    redirect: true,
    path: "/wheel",
    name: "WHEEL",
    icon: <AttractionsIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: WheelPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/dice",
    name: "DICE",
    icon: <CasinoIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: DicePage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/keno",
    name: "KENO",
    icon: <AppsIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: KenoPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/rubic",
    name: "RUBIC",
    icon: <CasinoIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: RubicPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/pumping",
    name: "PUMPING",
    icon: <GavelIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: PumpingPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/fishing",
    name: "Fishing",
    icon: <GiFishingHook style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: FishingPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/card-game",
    name: "CARD GAME",
    icon: <StyleIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: CardGamePage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/joker-crash",
    name: "JOKER CRASH",
    icon: <WhatshotIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: JokerCrashPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/coin",
    name: "COIN",
    icon: <MonetizationOnIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: CoinPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/gravity",
    name: "GRAVITY",
    icon: <TrendingUpIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: GravityPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/double",
    name: "DOUBLE",
    icon: <CasinoIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: DoublePage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/cloud-spread",
    name: "CLOUD SPREAD",
    icon: <CloudQueueIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: CloudSpreadPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/dove",
    name: "LUCKY HOP",
    icon: <TwitterIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Dove,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/digits",
    name: "DIGITS SLOT",
    icon: <Filter9Icon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: AToZPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/coco",
    name: "COCO TAP CRASH",
    icon: <GiChicken style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Coco,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/jackal",
    name: "JACKAL",
    icon: <ImageSearchIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Mining,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/mine",
    name: "MINE",
    icon: <DiamondIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: MinesPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/rocket-shot",
    name: "ROCKET SHOT",
    icon: <RocketLaunchIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: RocketShotPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/alpha-tree",
    name: "ALPHA TREE",
    icon: <ForestIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: AlphaTreePage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/twist",
    name: "TWIST",
    icon: <DonutLargeIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: TwistPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/climb",
    name: "CLIMB",
    icon: <DonutLargeIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: ClimbPage,
    layout: "/game",
  },
  {
    redirect: true,
    path: "/deposit",
    name: "DEPOSIT",
    icon: <CloudUploadRoundedIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Deposit,
    layout: "/transaction",
  },
  {
    redirect: true,
    path: "/withdraw",
    name: "WITHDRAW",
    icon: <CloudDownloadRoundedIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Withdraw,
    layout: "/transaction",
  },
  {
    redirect: true,
    path: "/myprofile",
    name: "MY PROFILE",
    icon: <PersonIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Profile,
    layout: "/user",
  },

  {
    // redirect: true,
    path: "/faq",
    name: "FAQ",
    icon: <HelpIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Faq,
    layout: "/help",
  },
  {
    path: "/contactus",
    name: "CONTACT US",
    icon: <ContactsIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: ContactUs,
    layout: "/help",
  },
  {
    path: "/support",
    name: "SUPPORT",
    icon: <PrivacyTipIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: SupportPage,
    layout: "/help",
  },
  {
    redirect: true,
    path: "/signin",
    name: "SIGN IN",
    icon: <DocumentIcon color='inherit' />,
    component: SignIn,
    layout: "/auth",
  },
  {
    redirect: true,
    path: "/signup",
    name: "SIGN UP",
    icon: <RocketIcon color='inherit' />,
    component: SignUp,
    layout: "/auth",
  },
  {
    redirect: true,
    path: "/2fa",
    name: "TWO FA",
    component: TwoFa,
    layout: "/auth",
  },
  {
    redirect: true,
    path: "/forgot-password",
    name: "FORGOT PASSWORD",
    component: ForgotPassword,
    layout: "/auth",
  },

  {
    redirect: true,
    path: "/tierA",
    name: "TIER A",
    component: Bet,
    icon: (
      <img
        src={tierA}
        alt="NumBanco Tier A"
        loading="eager"
        style={{ width: "18px", height: "18px", objectFit: "contain" }}
      />
    ),
    layout: "/numbanco",
  },
  {
    redirect: true,
    path: "/tierB",
    name: "TIER B",
    icon: (
      <img
        src={tierB}
        alt="NumBanco Tier B"
        loading="eager"
        style={{ width: "18px", height: "18px", objectFit: "contain" }}
      />
    ),
    component: Bet,
    layout: "/numbanco",
  },
  {
    redirect: true,
    path: "/tierC",
    name: "TIER C",
    icon: (
      <img
        src={tierC}
        alt="NumBanco Tier C"
        loading="eager"
        style={{ width: "18px", height: "18px", objectFit: "contain" }}
      />
    ),
    component: Bet,
    layout: "/numbanco",
  },
  {
    redirect: true,
    path: "/privacy-policy",
    name: "Privacy Policy",
    component: PrivacyPolicy,
    layout: "/auth",
  },
  {
    redirect: true,
    path: "/user-agreement",
    name: "User Agreement",
    component: UserAgreement,
    layout: "/auth",
  },
  // {

  //   redirect: true,
  //   path: "/auth/404",
  //   name: "Not Found Page",
  //   component: NotFound,
  //   layout: "/auth",
  // },
  // {
  //   redirect: true,
  //   path: "/twofa",
  //   name: "Twofa",
  //   component: TwoFA,
  //   layout: "/auth",
  // },
];
export default dashRoutes;
