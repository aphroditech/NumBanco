import React, { useEffect, useState } from "react";

import {
  Avatar,
  Badge,
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from "@chakra-ui/react";
import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import { getWinners } from "action/AuthActions"
import LocalPoliceRoundedIcon from '@mui/icons-material/LocalPoliceRounded';
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import truncateToTwo from "variables/truncateToTwo";

function TopBestWinner() {
  const [winners, setWinners] = useState([]);
  const history = useHistory();
  const getBadgeBgForGameType = (gameType) => {
    const t = (gameType || "").toLowerCase();
    if (t === "rubic") return "#805AD5";
    if (t === "numexa") return "#DD6B20";
    if (t === "pumping") return "#D53F8C";
    if (t === "gravity") return "#00B5D8";
    if (t === "deposit" || t === "withdraw") return "#3182CE";
    return "#4A5568";
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchWinners = async () => {
      try {
        const data = await getWinners(history);
        if (isMounted) {
          setWinners(data);
        }
      } catch (err) {
        if (isMounted) console.error(err);
      }
    };

    fetchWinners();

    return () => {
      isMounted = false;
    };
  }, []);



  return (
    <Card p="16px" overflowX="hidden">
      <CardHeader p="0px 0px 28px 0px">
        <Flex direction="column">
          <Text color="#00D4FF"
            fontWeight="bold" m="auto" width="auto" fontSize="25px" display="flex" alignItems="center" justifyContent="center">
            <LocalPoliceRoundedIcon
              style={{
                fontSize: "30px",
                color: "#00D4FF",
                marginRight: "8px",

              }} />
            Top Best 10 Winners
          </Text>
        </Flex>
      </CardHeader>

      <Box
        maxH={{ sm: "425px" }}
        overflowY="auto"
        overflowX="hidden"
        width="100%"
        sx={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#555b5e",
            borderRadius: "8px",
          },
        }}
      >
        <Table
          variant="simple"
          color="#fff"
          width="100%"
          sx={{ tableLayout: "fixed" }}
        >
          <Thead>
            <Tr>
              <Th color="white" textAlign="left" className="real_th_font" w="10%">
                No
              </Th>

              <Th color="white" className="real_th_font" w="30%">
                User
              </Th>

              <Th color="white" textAlign="left" className="real_th_font" w="18%">
                Game Type
              </Th>

              <Th color="white" className="real_th_font" w="22%">
                Win Amount
              </Th>

              <Th color="white" className="real_th_font" w="20%">
                Date
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {winners && winners.map((row, index, arr) => {
              const isLast = index === arr.length - 1;
              return (
                <Tr key={row._id || `${row.username}-${row.level}-${index}`}>
                  <Td textAlign="left" border={isLast ? "none" : null} borderBottomColor='#56577A'>
                    <Text fontSize='sm' color='#fff' fontWeight='normal'>
                      {index + 1}
                    </Text>
                  </Td>

                  <Td ps='0px' border={isLast ? "none" : null} borderBottomColor='#56577A'>
                    <Flex align='center' minWidth='100%' flexWrap='nowrap' gap="8px">
                      <Avatar src={row.avatar} w="28px" h="28px" />
                      <Text fontSize='sm' color='#fff' fontWeight='normal' isTruncated>
                        {row.username || "-"}
                      </Text>
                    </Flex>
                  </Td>

                  <Td textAlign="left" border={isLast ? "none" : null} borderBottomColor='#56577A'>
                    <Badge
                      variant="solid"
                      sx={{
                        bg: getBadgeBgForGameType(row.gameType),
                        color: "#FFFFFF",
                      }}
                    >
                      {row.gameType || "Unknown"}
                    </Badge>
                  </Td>

                  <Td textAlign="left" border={isLast ? "none" : null} borderBottomColor='#56577A'>
                    <Text fontSize='sm' color='#fff' fontWeight='normal'>
                      ${truncateToTwo(row.winAmount || 0)}
                    </Text>
                  </Td>

                  <Td textAlign="left" border={isLast ? "none" : null} borderBottomColor='#56577A'>
                    <Text fontSize='sm' color='#fff' fontWeight='normal'>
                      {formatDate(row.date)}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
export default TopBestWinner;