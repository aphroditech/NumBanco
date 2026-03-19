import React, { useEffect, useState } from "react";

import {
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
} from "@chakra-ui/react";
import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import TopBestWinnerRow from "components/Tables/TopBestWinnerRow";
import { getWinners } from "action/AuthActions"
import LocalPoliceRoundedIcon from '@mui/icons-material/LocalPoliceRounded';
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

function TopBestWinner() {
  const [winners, setWinners] = useState([]);
  const history = useHistory();

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
              <Th color="white" textAlign="left" className="real_th_font" w="15%">
                No
              </Th>

              <Th color="white" className="real_th_font" w="30%">
                User
              </Th>

              <Th color="white" textAlign="left" className="real_th_font" w="20%">
                Membership
              </Th>

              <Th color="white" className="real_th_font" w="30%">
                Total Bet Win
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {winners && winners.map((row, index, arr) => (
              <TopBestWinnerRow
                key={index}
                No={index + 1}
                logo={row.avatar}
                altas={row.altas}
                membership={row.membership}
                amounts={row.totalEarn}
                lastItem={index === arr.length - 1}
              />
            ))}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
export default TopBestWinner;