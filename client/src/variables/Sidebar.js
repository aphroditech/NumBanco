import { layout } from "@chakra-ui/system"
import tierA from "assets/badge/tierA.png";
import tierB from "assets/badge/tierB.png";
import tierC from "assets/badge/tierC.png";

// Load Games
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import TodayIcon from '@mui/icons-material/Today';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import Mining from "views/Mining/Mining";
import RocketShot from "views/RocketShot/RocketShot";
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import RubicPage from "views/Rubic/RubicPage";
import PumpingPage from "views/Pumping/PumpingPage";
import FishingPage from "views/Fishing/FishingPage";
import JokerCrashPage from "views/JokerCrash/JokerCrashPage";
import GravityPage from "views/Gravity/GravityPage";
import CloudSpreadPage from "views/CloudSpread/CloudSpreadPage";
import Dove from "views/DovePage/Dove";
import Coco from "views/Coco/CocoPage";
import MinesPage from "views/Mines/MinesPage";
import AToZPage from "views/AToZ/AToZ";
import CardGamePage from "views/CardGame/CardGamePage";
import AlphaTreePage from "views/AlphaTree/AlphaTree";
// Load Icons
import { GiChicken, GiFishingHook } from "react-icons/gi";
import CasinoIcon from '@mui/icons-material/Casino';
import GavelIcon from '@mui/icons-material/Gavel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DiamondIcon from '@mui/icons-material/Diamond';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import StyleIcon from '@mui/icons-material/Style';
import NumbersIcon from '@mui/icons-material/Numbers';
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import ForestIcon from '@mui/icons-material/Forest';
import Filter9Icon from '@mui/icons-material/Filter9';
import TrafficIcon from '@mui/icons-material/Traffic';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CoinPage from "views/Coin/CoinPage";

export const TierA = {
    path: "/tierA",
    name: "Tier A",
    type: "tier",
    level: "A",
    icon: <WaterDropIcon style={{ fontSize: "16px", color: "#00D4FF", marginLeft: "10px" }} />,
    layout: "/numbanco",
}

export const TierB = {
    path: "/tierB",
    name: "Tier B",
    type: "tier",
    level: "B",
    icon: <WaterDropIcon style={{ fontSize: "16px", color: "#00D4FF", marginLeft: "10px" }} />,
    layout: "/numbanco",
}

export const TierC = {
    path: "/tierC",
    name: "Tier C",
    type: "tier",
    level: "C",
    icon: <WaterDropIcon style={{ fontSize: "16px", color: "#00D4FF", marginLeft: "10px" }} />,
    layout: "/numbanco",
}

export const DailyLoot = {
    path: "/dailyloot",
    name: "DAILY LOOT",
    icon: <TodayIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: "DailyLoot",
    layout: "/admin",
    isAuth: true,
}

export const Reward = {
    path: "/reward",
    name: "REWARD",
    icon: <CurrencyExchangeIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: "Reward",
    layout: "/admin",
}

export const Jackal = {
    path: "/jackal",
    name: "JACKAL",
    icon: <ImageSearchIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Mining,
    layout: "/game",
}

export const Mines = {
    path: "/mine",
    name: "MINES",
    icon: <DiamondIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: MinesPage,
    layout: "/game",
}

export const Rocket = {
    path: "/rocket-shot",
    name: "ROCKET SHOT",
    icon: <RocketLaunchIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: RocketShot,
    layout: "/game",
}

export const Rubic = {
    path: "/rubic",
    name: "RUBIC",
    icon: <CasinoIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: RubicPage,
    layout: "/game",
}

export const Pumping = {
    path: "/pumping",
    name: "PUMPING",
    icon: <GavelIcon style={{ fontSize: "24px", color: "#00D4FF" }} />, 
    component: PumpingPage,
    layout: "/game",
}

export const Fishing = {
    path: "/fishing",
    name: "FISHING",
    icon: <GiFishingHook style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: FishingPage,
    layout: "/game",
}

export const JokerCrash = {
    path: "/joker-crash",
    name: "JOKER CRASH",
    icon: <WhatshotIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: JokerCrashPage,
    layout: "/game",
}

export const CardGame = {
    path: "/card-game",
    name: "CARD GAME",
    icon: <StyleIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: CardGamePage,
    layout: "/game",
}

export const Gravity = {
    path: "/gravity",
    name: "GRAVITY",
    icon: <TrendingUpIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: GravityPage,
    layout: "/game",
}

export const CloudSpread = {
    path: "/cloud-spread",
    name: "CLOUD SPREAD",
    icon: <CloudQueueIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: CloudSpreadPage,
    layout: "/game",
}

export const DoveGame = {
    path: "/dove",
    name: "LUCKY HOP",
    icon: <TrafficIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Dove,
    layout: "/game",
}

export const CocoGame = {
    path: "/coco",
    name: "COCO TAP CRASH",
    icon: <GiChicken style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: Coco,
    layout: "/game",
}



export const AToZGame = {
    path: "/digits",
    name: "DIGITS SLOT",
    icon: <Filter9Icon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: AToZPage,
    layout: "/game",
}

export const AlphaTreeGame = {
    path: "/alpha-tree",
    name: "ALPHA TREE",
    icon: <ForestIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: AlphaTreePage,
    layout: "/game",
}

export const Coin = {
    path: "/coin",
    name: "COIN FLIP",
    icon: <MonetizationOnIcon style={{ fontSize: "24px", color: "#00D4FF" }} />,
    component: CoinPage,
    layout: "/game",
}