import { Select, Grid, GridItem } from "@chakra-ui/react";
import GradientBorder from "components/GradientBorder/GradientBorder";

export default function StyledSelect({ placeholder, options = [], ...props }) {
    return (
        <Grid
        templateColumns='repeat(5, 1fr)'
        mb="24px"
        w={{ base: "100%"}}
        >
            <GridItem
                colSpan={{sm: '5', md: '2'}}
                w="100%"
                ms='4px'
                fontSize='sm'
                fontWeight='normal'
                pt="15px"
                color='white'>
                {props.coin}
            </GridItem>
            <GridItem colSpan={{ sm: "5", md: "3" }}>
                <Grid gap="12px">
                    <GradientBorder w="100%" borderRadius="20px">
                        <Select
                        color="white"
                        bg="#323738"
                        border="transparent"
                        borderRadius="20px"
                        fontSize="sm"
                        size="lg"
                        w="100%"
                        h="46px"
                        disabled={props.readOnly}
                        sx={{
                            option: {
                                backgroundColor: "#323738",
                                color: "white",
                                padding: "12px 10px", // ← increases height
                                fontSize: "16px",
                                borderRadius: "12px", // ← MAY NOT work on all browsers
                            },
                        }}
                        placeholder={placeholder}
                        {...props}
                        >
                            {options.map((opt, i) => (
                                <option
                                h="10px"
                                key={i}
                                value={opt}
                                style={{ backgroundColor: "#323738" }} 
                                >
                                    {opt}
                                </option>
                            ))}
                        </Select>
                    </GradientBorder>
                </Grid>
            </GridItem>
        </Grid>
    );
}