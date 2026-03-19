import { Badge, Box, Flex, Icon, Text, Td, Tr, IconButton, Tooltip } from "@chakra-ui/react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCopy
} from "react-icons/fa";
import React, { useState } from "react";
import tron from "assets/img/tron.png"
import bsc from "assets/img/bsc.png"
import ethereum from "assets/img/ethereum.png"

function TransactionRow(props) {
  const { net, coin, date, fill, price, type, txhash } = props;
  const [copied, setCopied] = useState(false);
  
  // Function to get blockchain explorer URL based on net
  const getExplorerUrl = (net, txhash) => {
    if (!txhash) return null;
    
    switch (net?.toLowerCase()) {
      case 'eth':
        return `https://etherscan.io/tx/${txhash}`;
      case 'btc':
        return `https://blockstream.info/tx/${txhash}`;
      case 'bnb':
        return `https://bscscan.com/tx/${txhash}`;
      case 'bsc':
        return `https://bscscan.com/tx/${txhash}`;
      case 'tron':
        return `https://nile.tronscan.org//#/transaction/${txhash}`;
      default:
        return null;
    }
  };

  const formatAmount = (type, price) => {
    const prefix = type === "deposit" ? "+" : "-";
    return `${prefix}${price}$`;
  };

  const getAmountColor = (type, price, fill) => {
    switch (fill) {
      case "success":
        return "#01B574"; // green
      case "failed":
        return "red.500"; // red
      case "pending":
      default:
        return "gray.400"; // gray
    }
  };

  const getStatusColor = (fill) => {
    switch (fill) {
      case "success":
        return "#01B574";
      case "failed":
        return "red.500";
      default:
        return "yellow.500";
    }
  };

  const getCoinImage = (net) => {
    switch (net?.toLowerCase()) {
      case 'tron':
        return tron;
      case 'bnb':
      case 'bsc':
        return bsc;
      case 'eth':
        return ethereum;
      default:
        return null;
    }
  };

  const getCoinBadgeColor = (net) => {
    switch (net?.toLowerCase()) {
      case 'tron':
        return 'red';
      case 'bnb':
      case 'bsc':
        return 'yellow';
      case 'eth':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (fill) => {
    switch (fill) {
      case "success":
        return FaCheckCircle;
      case "failed":
        return FaTimesCircle;
      default:
        return FaClock;
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const truncateTxHash = (txhash) => {
    if (!txhash) return '-';
    return txhash.length > 15 
      ? `${txhash.substring(0, 8)}...${txhash.substring(txhash.length - 6)}`
      : txhash;
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    
    // Check if Clipboard API is available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      }).catch((err) => {
        console.error('Failed to copy text: ', err);
        // Fallback method
        fallbackCopyToClipboard(text);
      });
    } else {
      // Fallback for browsers that don't support Clipboard API
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
  };

  return (
    <Tr>
      <Td borderColor="gray.700" textAlign="center">
        <Flex align="center" gap={1} justify="center">
          {getCoinImage(net) && (
            <img 
              src={getCoinImage(net)} 
              alt={`NumBanco ${net}`} 
              loading="eager"
              style={{ width: '16px', height: '16px' }}
            />
          )}
          <Badge 
            variant="solid"
            colorScheme={getCoinBadgeColor(net)} 
          >
            {net?.toUpperCase()}
          </Badge>
        </Flex>
      </Td>
      <Td borderColor="gray.700" textAlign="center">
        <Text fontSize="sm" color={getAmountColor(type, price, fill)} fontWeight="bold">
          {formatAmount(type, price)}
        </Text>
      </Td>
      <Td borderColor="gray.700">
        <Flex align="center" gap={2} justify="center" pl="15px">
          {getExplorerUrl(net, txhash) ? (
            <Text
              textAlign="center"
              fontSize="sm"
              color="white"
              cursor="pointer"
              textDecoration="underline"
              onClick={() => window.open(getExplorerUrl(net, txhash), '_blank')}
              _hover={{ color: "#63B3ED" }}
            >
              {truncateTxHash(txhash)}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.500" fontFamily="monospace" textAlign="center">
              {truncateTxHash(txhash)}
            </Text>
          )}
          {txhash && (
            <Tooltip 
              label={copied ? "Copied!" : "Copy transaction hash"}
              placement="top"
              hasArrow
              isOpen={copied ? true : undefined}
              bg={copied ? "green.500" : "gray.700"}
              color="white"
              fontSize="xs"
            >
              <IconButton
                icon={<FaCopy />}
                size="xs"
                variant="ghost"
                color={copied ? "green.400" : "gray.400"}
                _hover={{ color: "white", bg: "gray.700" }}
                onClick={() => copyToClipboard(txhash)}
                aria-label="Copy transaction hash"
              />
            </Tooltip>
          )}
        </Flex>
      </Td>
      <Td borderColor="gray.700" textAlign="center">
        <Text fontSize="sm" color="#fff">
          {formatDate(date)}
        </Text>
      </Td>
      <Td borderColor="gray.700" textAlign="center">
        <Badge 
          variant="solid"
          colorScheme={fill === 'success' ? 'green' : fill === 'failed' ? 'red' : 'yellow'}
        >
          <Icon
            as={getStatusIcon(fill)}
            mr={1}
            boxSize="3"
          />
          {fill || 'pending'}
        </Badge>
      </Td>
    </Tr>
  );
}

export default TransactionRow;
