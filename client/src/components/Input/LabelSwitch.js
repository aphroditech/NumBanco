import { DarkMode, FormControl, Switch, FormLabel } from "@chakra-ui/react";
import React from "react";

function LabelSwitch(props) {
  const { label, onChange, status } = props;
  const titleColor = "#fff";

  return (
    <FormControl display="flex" alignItems="center" >
      <DarkMode>
        <Switch
          isChecked={status}
          onChange={onChange}
          me="10px"
        />
      </DarkMode>

      <FormLabel
        color={titleColor}
        mb="0"
        fontWeight="normal"
      >
        {label}
      </FormLabel>
    </FormControl>
  );
}

export default LabelSwitch;
