import React, { useState } from 'react';
import { IconButton, Tooltip } from '@chakra-ui/react';
import { CopyIcon } from '@chakra-ui/icons';

function CopyBadge({ address, onCopy }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!address) return;

        try {
            // ✅ Modern clipboard API (HTTPS / localhost only)
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(address);
            }
            // 🔁 Fallback for HTTP / older browsers
            else {
                const textarea = document.createElement("textarea");
                textarea.value = address;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }

            setCopied(true);
            onCopy?.();
            setTimeout(() => setCopied(false), 2000);

        } catch (err) {
            console.error("Failed to copy address:", err);
        }
    };

    return (
        <Tooltip label="Copied address successfully!" placement="top" isOpen={copied}>
            <IconButton
                icon={<CopyIcon />}
                onClick={handleCopy}
                isDisabled={!address}
                size="xs"
                variant="ghost"
                color={copied ? "green.400" : "white"}
                opacity={address ? 0.7 : 0.3}
                _hover={{ bg: 'transparent', opacity: 1 }}
                _active={{ transform: 'scale(0.95)' }}
                aria-label="Copy address"
            />
        </Tooltip>
    );
}

export default CopyBadge;
