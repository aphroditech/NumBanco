import React from "react";

import { 
    Box,
    Text,
    Flex,
} from "@chakra-ui/react";
import Card from "components/Card/Card";
import CardHeader from "components/Card/CardHeader";
import ProfilChart from 'components/Charts/ProfilChart';

import {
    profilChartDataDashboard,
    profilChartOptionsDashboard
} from 'variables/charts';

import Loading from "components/Loading/Loading";

function ProfileChat() {
    const [isLoading, setIsLoading] = useState(false);
    return (
        <Card>
            <CardHeader mb='20px' ps='22px'>
                <Flex direction='column' alignSelf='flex-start'>
                    <Text fontSize='lg' color='#fff' fontWeight='bold' mb='6px'>
                        Profil Chart
                    </Text>
                </Flex>
            </CardHeader>
            <Box w='100%' minH={{ sm: '300px' }}>
                <ProfilChart
                    profilChartData={profilChartDataDashboard}
                    profilChartOptions={profilChartOptionsDashboard}
                />
            </Box>
        </Card>
    );
}

export default ProfileChat;