// /*!

// =========================================================
// * Vision UI Free Chakra - v1.0.0
// =========================================================

// * Product Page: https://www.creative-tim.com/product/vision-ui-free-chakra
// * Copyright 2021 Creative Tim (https://www.creative-tim.com/)
// * Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-chakra/blob/master LICENSE.md)

// * Design and Coded by Simmmple & Creative Tim

// =========================================================

// * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

// */

// import { Box, Flex, Icon, Text } from "@chakra-ui/react";
// import {
//   FaArrowDown,
//   FaArrowUp
// } from "react-icons/fa";
// import React from "react";

// function TransactionRow(props) {
//   const { net, coin, date, fill, price, type, txhash } = props;

//   // Function to get blockchain explorer URL based on coin
//   const getExplorerUrl = (net, txhash) => {
//     if (!txhash) return null;
    
//     switch (net?.toLowerCase()) {
//       case 'ethereum':
//         return `https://etherscan.io/tx/${txhash}`;
//       case 'btc':
//         return `https://blockstream.info/tx/${txhash}`;
//       case 'bnb':
//       case 'bsc':
//         return `https://bscscan.com/tx/${txhash}`;
//       case 'tron':
//         return `https://nile.tronscan.org//#/transaction/${txhash}`;
//       case 'usdt':
//         // USDT on different chains - default to Ethereum
//         return `https://etherscan.io/tx/${txhash}`;
//       default:
//         return null;
//     }
//   };

//   const explorerUrl = getExplorerUrl(net, txhash);

//   return (
//     <Flex mb='24px' justifyContent='space-between'>
//       <Flex alignItems='center'>
//         <Box
//           me='14px'
//           borderRadius='50%'
//           color={ fill === "success" ? "#01B574" : fill === "failed" ? "red.500" : "gray.400" }
//           border='1px solid'
//           display='flex'
//           alignItems='center'
//           justifyContent='center'
//           w='35px'
//           h='35px'>
//             {type==="withdraw"&&<Icon as={FaArrowDown} w='12px' h='12px' />}
//             {type==="deposit"&&<Icon as={FaArrowUp} w='12px' h='12px' />}
//         </Box>
//         <Flex direction='column'>
//           <Text fontSize='sm' color='#fff' mb='4px'>
//             {net} - {coin}
//           </Text>
//           <Text fontSize={{ sm: "xs", md: "sm" }} color='gray.400' mb='2px'>
//             {new Date(date).toLocaleDateString()}, {new Date(date).toLocaleTimeString()}
//           </Text>
//           {txhash && explorerUrl ? (
//             <Text 
//               as="a" 
//               href={explorerUrl} 
//               target="_blank" 
//               rel="noopener noreferrer"
//               fontSize={{ sm: "xs", md: "sm" }} 
//               color='blue.400' 
//               fontFamily='monospace'
//               cursor="pointer"
//               textDecoration="underline"
//               _hover={{ color: 'blue.300' }}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 window.open(explorerUrl, '_blank', 'noopener,noreferrer');
//               }}
//             >
//               {txhash.length > 15 ? `${txhash.substring(0, 8)}...${txhash.substring(txhash.length - 6)}` : txhash}
//             </Text>
//           ) : (
//             <Text fontSize={{ sm: "xs", md: "sm" }} color='gray.500' fontFamily='monospace'>
//               {txhash ? (txhash.length > 15 ? `${txhash.substring(0, 8)}...${txhash.substring(txhash.length - 6)}` : txhash) : 'Pending...'}
//             </Text>
//           )}
//         </Flex>
//       </Flex>
//       <Box
//         color={
//           price && price[0] === "+"
//             ? "#01B574"
//             : price && price[0] === "-"
//             ? "red.500"
//             : "gray.400"
//         }>
//         <Text fontSize='sm'>{type==="deposit"? "+":"-"}{price}$</Text>
//       </Box>
//     </Flex>
//   );
// }

// export default TransactionRow;