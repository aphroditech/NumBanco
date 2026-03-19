import React, { useEffect, useState } from 'react';
import { Flex } from '@chakra-ui/react';
import Overview from 'views/Profile/ProfileItem/Overview';
import ProfileTab from 'views/Profile/ProfileItem/ProfileTab';
import Loading from 'components/Loading/Loading';

function Profile() {
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadingTime = (Math.floor(Math.random() * 10) + 1) * 100;

		const timer = setTimeout(() => {
			setIsLoading(false);
		}, loadingTime);

		return () => clearTimeout(timer);
	}, []);

	if (isLoading) {
		return <Loading />;
	}

	return (
		<Flex direction='column' mt={{ sm: '25px', md: '0px' }} gap={25}>
			<Overview />
			<ProfileTab />
		</Flex>
	);
}

export default Profile;