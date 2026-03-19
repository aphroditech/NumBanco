import React, { useState, useEffect } from 'react';
import { Box, keyframes } from '@chakra-ui/react';
import anime1 from '../../assets/img/DashAnime/anime1.png';
import anime2 from '../../assets/img/DashAnime/anime2.png';
import anime3 from '../../assets/img/DashAnime/anime3.png';
import anime4 from '../../assets/img/DashAnime/anime4.png';
import anime5 from '../../assets/img/DashAnime/anime5.png';
import anime6 from '../../assets/img/DashAnime/anime6.png';

// Keyframes for the "cover" animation: scales up and fades in
const coverScaleFade = keyframes`
  0% { transform: scale(1.2); opacity: 0; }
  
  100% { transform: scale(1); opacity: 1; }
`;

export default function VerticalSlider() {
  const images = [anime1, anime2, anime3, anime4, anime5, anime6];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!images.length) return;

    let timeoutId;

    const intervalId = setInterval(() => {
      setTransitioning(true);

      timeoutId = setTimeout(() => {
        setCurrentIndex(prev => {
          const next = (prev + 1) % images.length;
          setNextIndex((next + 1) % images.length);
          return next;
        });

        setTransitioning(false);
      }, 800);
    }, 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [images.length]);


  return (
    <Box
      h="110px"
      w="100%"
      position="relative"
      overflow="hidden"
      borderRadius="12px"
      my="18px"
      bg="rgba(0,0,0,0.1)"
    >
      {/* Current Image */}
      <Box
        position="absolute"
        top="0"
        left="0"
        w="100%"
        h="100%"
        zIndex={1}
      >
        <Box
          backgroundImage={`url(${images[currentIndex]})`}
          alt={`NumBanco Current anime ${currentIndex + 1}`}
          loading="eager"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </Box>

      {/* Next Image scales and fades over current image */}
      {transitioning && (
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          animation={`${coverScaleFade} 0.8s ease forwards`}
          zIndex={2}
        >
          <Box
            backgroundImage={`url(${images[nextIndex]})`}
            alt={`NumBanco Next anime ${nextIndex + 1}`}
            loading="eager"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
      )}
    </Box>
  );
}
