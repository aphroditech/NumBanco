import { layout } from "@chakra-ui/system"
import tierA from "assets/badge/tierA.png";
import tierB from "assets/badge/tierB.png";
import tierC from "assets/badge/tierC.png";
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import TodayIcon from '@mui/icons-material/Today';
import WaterDropIcon from '@mui/icons-material/WaterDrop';

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