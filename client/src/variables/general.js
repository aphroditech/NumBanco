// Assets

// Custom icons
import {
  AdobexdLogo,
  AtlassianLogo,
  InvisionLogo,
  JiraLogo,
  SlackLogo,
  SpotifyLogo,
} from "components/Icons/Icons.js";
import { AiOutlineExclamation } from "react-icons/ai";
import {
  FaArrowDown,
  FaArrowUp,
  FaBell,
  FaCreditCard,
  FaFilePdf,
  FaHtml5,
  FaShoppingCart,
} from "react-icons/fa";
import { SiDropbox } from "react-icons/si";

import firstplace from "assets/badge/place/1.png";
import secondtplace from "assets/badge/place/2.png";
import thirdplace from "assets/badge/place/3.png";
import fourthplace from "assets/badge/place/4.png";
import fifthplace from "assets/badge/place/5.png";
import sixthplace from "assets/badge/place/6.png";


export const timelineData = [
  {
    logo: FaBell,
    title: "$2400, Design changes",
    date: "22 DEC 7:20 PM",
    color: "brand.200",
  },
  {
    logo: FaHtml5,
    title: "New order #4219423",
    date: "21 DEC 11:21 PM",
    color: "orange",
  },
  {
    logo: FaShoppingCart,
    title: "Server Payments for April",
    date: "21 DEC 9:28 PM",
    color: "blue.400",
  },
  {
    logo: FaCreditCard,
    title: "New card added for order #3210145",
    date: "20 DEC 3:52 PM",
    color: "orange.300",
  },
  {
    logo: SiDropbox,
    title: "Unlock packages for Development",
    date: "19 DEC 11:35 PM",
    color: "purple",
  },
  {
    logo: AdobexdLogo,
    title: "New order #9851258",
    date: "18 DEC 4:41 PM",
  },
];

export const tablesProjectData = [
  {
    logo: AdobexdLogo,
    name: "Vision UI Version",
    budget: "$14,000",
    status: "Working",
    progression: 60,
  },
  {
    logo: AtlassianLogo,
    name: "Add Progress Track",
    budget: "$3,000",
    status: "Canceled",
    progression: 10,
  },
  {
    logo: SlackLogo,
    name: "Fix Platform Errors",
    budget: "Not set",
    status: "Done",
    progression: 100,
  },
  {
    logo: SpotifyLogo,
    name: "Launch our Mobile App",
    budget: "$32,000",
    status: "Done",
    progression: 100,
  },
  {
    logo: JiraLogo,
    name: "Add the New Pricing Page",
    budget: "$400",
    status: "Working",
    progression: 25,
  },
];

export const invoicesData = [
  {
    date: "March, 01, 2020",
    code: "#MS-415646",
    price: "$180",
    logo: FaFilePdf,
    format: "PDF",
  },
  {
    date: "February, 10, 2020",
    code: "#RV-126749",
    price: "$250",
    logo: FaFilePdf,
    format: "PDF",
  },
  {
    date: "April, 05, 2020",
    code: "#FB-212562",
    price: "$560",
    logo: FaFilePdf,
    format: "PDF",
  },
  {
    date: "June, 25, 2019",
    code: "#QW-103578",
    price: "$120",
    logo: FaFilePdf,
    format: "PDF",
  },
  {
    date: "March, 01, 2019",
    code: "#AR-803481",
    price: "$300",
    logo: FaFilePdf,
    format: "PDF",
  },
];

export const billingData = [
  {
    name: "Oliver Liam",
    company: "Viking Burrito",
    email: "oliver@burrito.com",
    number: "FRB1235476",
  },
  {
    name: "Lucas Harper",
    company: "Stone Tech Zone",
    email: "lucas@stone-tech.com",
    number: "FRB1235476",
  },
  {
    name: "Ethan James",
    company: "Fiber Notion",
    email: "ethan@fiber.com",
    number: "FRB1235476",
  },
];

export const newestTransactions = [
  {
    name: "Netflix",
    date: "27 March 2021, at 12:30 PM",
    price: "- $2,500",
    logo: FaArrowDown,
  },
  {
    name: "Apple",
    date: "27 March 2021, at 12:30 PM",
    price: "+ $2,500",
    logo: FaArrowUp,
  },
];

export const olderTransactions = [
  {
    name: "Stripe",
    date: "26 March 2021, at 13:45 PM",
    price: "+ $800",
    logo: FaArrowUp,
  },
  {
    name: "HubSpot",
    date: "26 March 2021, at 12:30 PM",
    price: "+ $1,700",
    logo: FaArrowUp,
  },
  {
    name: "Webflow",
    date: "26 March 2021, at 05:00 PM",
    price: "Pending",
    logo: AiOutlineExclamation,
  },
  {
    name: "Microsoft",
    date: "25 March 2021, at 16:30 PM",
    price: "- $987",
    logo: FaArrowDown,
  },
];

export const freeTopMembership = [
  {
    name: "Bet",
    price: "1$",
  },
  {
    name: "Transaction",
    price: "Release",
  },
  {
    name: "Withdraw",
    price: "up to 100$ per day",
  },
];

export const freeLowMembership = [
  {
    name: "Buy Ticket",
    price: "5",
  },
  {
    name: "Badge",
    price: "None",
  },
  {
    name: "Withdraw Fee",
    price: "Any",
  },
  {
    name: "Pre Bet",
    price: "1",
  },
];

export const plusTopMembership = [
  {
    name: "Bet",
    price: "5$",
  },
  {
    name: "Transaction",
    price: "Private",
  },
  {
    name: "Withdraw",
    price: "At least 10000$ per day",
  },
];

export const plusLowMembership = [
  {
    name: "Buy Ticket",
    price: "50",
  },
  {
    name: "Badge",
    price: "Plus",
  },
  {
    name: "Withdraw Fee",
    price: "Any",
  },
  {
    name: "Pre Bet",
    price: "5",
  },
];
export const proTopMembership = [
  {
    name: "Bet",
    price: "50$",
  },
  {
    name: "Transaction",
    price: "Private",
  },
  {
    name: "Withdraw",
    price: "unlimited",
  },
];

export const proLowMembership = [
  {
    name: "Buy Ticket",
    price: "100",
  },
  {
    name: "Badge",
    price: "Pro",
  },
  {
    name: "Withdraw Fee",
    price: "None",
  },
  {
    name: "Pre Bet",
    price: "20",
  },
];

export const earningHistoryData = [
  {
    date: "2025/11/22 10:22:22",
    amounts: "10$",
  },
  {
    date: "2025/11/22 10:22:22",
    amounts: "20$",
  },{
    date: "2025/11/22 10:22:22",
    amounts: "5$",
  },{
    date: "2025/11/22 10:22:22",
    amounts: "100$",
  },{
    date: "2025/11/22 10:22:22",
    amounts: "20$",
  },
];

export const accountHistory = [
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
  {
    wallet: "TRON-USDT",
    amounts: "100$",
    status: "success",
    date: "2025:12:05 04:32:12"
  },
]


export const betHistoryData = [
  {
    logo: firstplace,
    content: [
      { 
        ticket: "20",
        altas: "John"
      } 
    ],
    color: "brand.200",
  },
  {
    logo: secondtplace,
    content: [
      { 
        ticket: "20",
        altas: "Kevin Smith"
      },
      { 
        ticket: "20",
        altas: "Donald Anderson"
      }
    ],
    color: "orange",
  },
  {
    logo: thirdplace,
    content: [
      { 
        ticket: "20",
        altas: "hunter"
      },
      { 
        ticket: "20",
        altas: "Faker"
      },
      { 
        ticket: "20",
        altas: "Scammer"
      }
    ],
    color: "blue.400",
  },
  {
    logo: fourthplace,
    content: [
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      }
    ],
    color: "blue.400",
  },
  {
    logo: fifthplace,
    content: [
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
    ],
    color: "blue.400",
  },
  {
    logo: sixthplace,
    content: [
      { 
        ticket: "20",
        altas: "J"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      },
      { 
        ticket: "20",
        altas: "John Doe"
      }
    ],
    color: "blue.400",
  },
];


export const depositHistoryData = [
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "20",
    date: "2025-11-21 11:19:31",
    result: "success"
  },  
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  },  
];



export const withdrawHistoryData = [
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  },  
  {
    coin: "TRON-USDT",
    amounts: "20",
    date: "2025-11-21 11:19:31",
    result: "success"
  },{
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  },  
  {
    coin: "TRON-USDT",
    amounts: "20",
    date: "2025-11-21 11:19:31",
    result: "success"
  },{
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  },  
  {
    coin: "TRON-USDT",
    amounts: "20",
    date: "2025-11-21 11:19:31",
    result: "success"
  },{
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  }, 
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "error"
  },  
  {
    coin: "TRON-USDT",
    amounts: "20",
    date: "2025-11-21 11:19:31",
    result: "success"
  },{
    coin: "TRON-USDT",
    amounts: "300",
    date: "2025-11-23 11:22:31",
    result: "pending"
  },  
  {
    coin: "TRON-USDT",
    amounts: "100",
    date: "2025-11-22 11:22:31",
    result: "success"
  },
  {
    coin: "TRON-USDT",
    amounts: "35",
    date: "2025-11-21 11:22:31",
    result: "pending"
  }, 
];


export const TransactionData = [
  {
    name: "Netflix",
    date: "27 March 2021, at 12:30 PM",
    price: "- $2,500",
    logo: FaArrowDown,
  },
  {
    name: "Apple",
    date: "27 March 2021, at 12:30 PM",
    price: "+ $2,500",
    logo: FaArrowUp,
  },
  {
    name: "Stripe",
    date: "26 March 2021, at 13:45 PM",
    price: "+ $800",
    logo: FaArrowUp,
  },
  {
    name: "HubSpot",
    date: "26 March 2021, at 12:30 PM",
    price: "+ $1,700",
    logo: FaArrowUp,
  },
  {
    name: "Webflow",
    date: "26 March 2021, at 05:00 PM",
    price: "Pending",
    logo: AiOutlineExclamation,
  },
  {
    name: "Microsoft",
    date: "25 March 2021, at 16:30 PM",
    price: "- $987",
    logo: FaArrowDown,
  },
  {
    name: "Stripe",
    date: "26 March 2021, at 13:45 PM",
    price: "+ $800",
    logo: FaArrowUp,
  },
  {
    name: "HubSpot",
    date: "26 March 2021, at 12:30 PM",
    price: "+ $1,700",
    logo: FaArrowUp,
  },
  {
    name: "Webflow",
    date: "26 March 2021, at 05:00 PM",
    price: "Pending",
    logo: AiOutlineExclamation,
  },
  {
    name: "Netflix",
    date: "27 March 2021, at 12:30 PM",
    price: "- $2,500",
    logo: FaArrowDown,
  },
  {
    name: "Apple",
    date: "27 March 2021, at 12:30 PM",
    price: "+ $2,500",
    logo: FaArrowUp,
  },
  {
    name: "Microsoft",
    date: "25 March 2021, at 16:30 PM",
    price: "- $987",
    logo: FaArrowDown,
  }
];