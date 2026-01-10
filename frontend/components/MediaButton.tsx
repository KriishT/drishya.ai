interface MediaButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  isPlayButton?: boolean;
  isPlaying?: boolean;
}

export default function MediaButton({
  onClick,
  disabled = false,
  children,
  className = "",
  isPlayButton = false,
  isPlaying = false,
}: MediaButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative font-['Tahoma'] text-sm font-bold transition-all ${className}`}
      style={{
        padding: isPlayButton ? "8px 20px" : "8px 14px",
        background: disabled
          ? "linear-gradient(to bottom, #D4D0C8 0%, #B5B0A8 50%, #9C9790 50%, #8B8680 100%)"
          : isPlaying && isPlayButton
          ? "linear-gradient(to bottom, #FFE5B4 0%, #FFD480 50%, #FFC850 50%, #FFB830 100%)"
          : "linear-gradient(to bottom, #FAFAFA 0%, #E8E8E8 50%, #CFCFCF 50%, #B8B8B8 100%)",
        border: disabled ? "1px solid #808080" : "1px solid #6B6B6B",
        borderRadius: "3px",
        boxShadow: disabled
          ? "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.2)"
          : "inset 0 2px 1px rgba(255,255,255,0.9), inset 0 -2px 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)",
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#999" : "#000",
        textShadow: !disabled ? "0 1px 0 rgba(255,255,255,0.7)" : "none",
      }}
      onMouseDown={(e) =>
        !disabled && (e.currentTarget.style.transform = "translateY(1px)")
      }
      onMouseUp={(e) =>
        !disabled && (e.currentTarget.style.transform = "translateY(0)")
      }
      onMouseLeave={(e) =>
        !disabled && (e.currentTarget.style.transform = "translateY(0)")
      }
    >
      {children}
    </button>
  );
}
