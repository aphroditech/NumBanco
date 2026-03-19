import React from 'react';
import { useState } from "react";
import {
    Box,
    DarkMode,
    Grid,
    Tabs, 
    TabList, 
    TabPanels, 
    Tab, 
    TabPanel
} from '@chakra-ui/react';

import Card from 'components/Card/Card';
import { motion } from "framer-motion";
import { ProfileTabItems } from 'views/Profile/ProfileItem/ProfileTabItem/ProfileTabItems';

const MotionBox = motion(Box);

function ProfileTab() {
    const [activeIndex, setActiveIndex] = useState(0);
    
    return (
        <Grid templateColumns={{ sm: '1fr', xl: '1fr' }} gap='20px'>
            <DarkMode>
                <Card p='24px' gridArea={{ xl: '1 / 1 / 2 / 2' }}>
                    <Tabs 
                    isFitted 
                    variant='enclosed' 
                    width="full" 
                    color="#fff"
                    colorScheme="cyan"
                    onChange={(i) => setActiveIndex(i)}>
                        <TabList>
                        {ProfileTabItems.map((item, idx) => (
                            <Tab 
                                _focus={{ outline: "none" }}
                                key={idx}     									
                                _hover={{ bg: "none" }}
                                border="none"
                                outline="none"
                                boxShadow="none">
                                {item.title}
                            </Tab>
                        ))}
                        </TabList>

                        <TabPanels position="relative" minH="200px">
                        {ProfileTabItems.map((item, idx) => (
                            <TabPanel 
                            key={idx} 
                            p={0}
                            paddingTop={18}
                            >
                            <MotionBox
                                key={activeIndex} // <-- forces re-mount on tab click
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                type: "spring",
                                stiffness: 140,
                                damping: 12,
                                mass: 0.4,
                                }}
                            >
                                {item.content}
                            </MotionBox>
                            </TabPanel>
                        ))}
                        </TabPanels>
                    </Tabs>
                </Card>
            </DarkMode>
        </Grid>
    );
}

export default ProfileTab;