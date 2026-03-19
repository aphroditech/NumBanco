import { 
    Box,
    AccordionItem,
    AccordionButton,
    AccordionIcon,
    AccordionPanel
} from "@chakra-ui/react";

function FaqRow(props) {
  const { title, content, key } = props;

  return (
    <AccordionItem key={key} borderTop='none'>
        <h2>
        <AccordionButton _focus="outline:none">
            <Box flex='1' textAlign='left' color='white' padding="7px">
                {title}
            </Box>
            <AccordionIcon color='white' />
        </AccordionButton>
        </h2>
        <AccordionPanel pb={4} color='white'>
            {content}
        </AccordionPanel>
    </AccordionItem>
  );
}

export default FaqRow;
