#!/bin/bash
set -e

# ULTIMATE — Living Intelligence Entity
# Installer: curl -fsSL https://raw.githubusercontent.com/ranker-002/absolute/main/install.sh | bash

REPO="https://github.com/ranker-002/absolute.git"
INSTALL_DIR="${ULTIMATE_DIR:-$HOME/.ultimate}"
BIN_DIR="${ULTIMATE_BIN:-$HOME/.local/bin}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     ULTIMATE — Living Intelligence Installer    ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
check_deps() {
    local missing=0
    for cmd in git node npm; do
        if ! command -v "$cmd" &> /dev/null; then
            echo -e "${RED}✗ Missing: $cmd${NC}"
            missing=1
        fi
    done
    if [ $missing -eq 1 ]; then
        echo ""
        echo -e "${YELLOW}Install missing dependencies:${NC}"
        echo "  Node.js: https://nodejs.org (v18+)"
        echo "  Git: https://git-scm.com"
        exit 1
    fi

    # Check Node version
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}✗ Node.js v18+ required (found v$(node -v))${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Dependencies OK${NC}"
}

# Clone or update repo
install_ultimate() {
    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}↑ Updating existing installation...${NC}"
        cd "$INSTALL_DIR"
        git pull --quiet
    else
        echo -e "${BLUE}↓ Cloning ULTIMATE...${NC}"
        git clone --quiet "$REPO" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install --quiet 2>/dev/null

    # Create .env if not exists
    if [ ! -f .env ]; then
        cp .env.example .env 2>/dev/null || true
    fi

    # Create required directories
    mkdir -p memory skills plugins snapshots forms/history knowledge templates marketplace

    echo -e "${GREEN}✓ Installed to $INSTALL_DIR${NC}"
}

# Create global bin symlink
setup_bin() {
    mkdir -p "$BIN_DIR"

    # Write bin script with resolved install dir
    echo '#!/bin/bash' > "$BIN_DIR/ultimate"
    echo "exec npx tsx \"$INSTALL_DIR/index.ts\" \"\$@\"" >> "$BIN_DIR/ultimate"
    chmod +x "$BIN_DIR/ultimate"

    # Add to PATH if not already
    if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
        SHELL_RC=""
        if [ -f "$HOME/.bashrc" ]; then SHELL_RC="$HOME/.bashrc"
        elif [ -f "$HOME/.zshrc" ]; then SHELL_RC="$HOME/.zshrc"
        elif [ -f "$HOME/.config/fish/config.fish" ]; then SHELL_RC="$HOME/.config/fish/config.fish"
        fi

        if [ -n "$SHELL_RC" ]; then
            if [[ "$SHELL_RC" == *"fish"* ]]; then
                echo "set -gx PATH $BIN_DIR \$PATH" >> "$SHELL_RC"
            else
                echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
            fi
            echo -e "${GREEN}✓ Added $BIN_DIR to PATH in $SHELL_RC${NC}"
            echo -e "${YELLOW}  Run: source $SHELL_RC${NC}"
        fi
    fi

    echo -e "${GREEN}✓ Global command available: ultimate${NC}"
}

# Setup API key
setup_config() {
    echo ""
    echo -e "${YELLOW}┌─────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│  OpenRouter API Key Required                │${NC}"
    echo -e "${YELLOW}│                                             │${NC}"
    echo -e "${YELLOW}│  Get yours FREE at:                         │${NC}"
    echo -e "${YELLOW}│  https://openrouter.ai/keys                 │${NC}"
    echo -e "${YELLOW}└─────────────────────────────────────────────┘${NC}"
    echo ""

    # Check if key already configured
    if [ -f "$INSTALL_DIR/.env" ]; then
        KEY=$(grep -E "^OPENROUTER_API_KEY=" "$INSTALL_DIR/.env" | cut -d= -f2)
        if [ -n "$KEY" ] && [ "$KEY" != "sk-or-..." ]; then
            echo -e "${GREEN}✓ API key already configured${NC}"
            return
        fi
    fi

    # Prompt for API key
    echo -ne "${CYAN}Paste your OpenRouter API key (or press Enter to skip): ${NC}"
    read -r API_KEY

    if [ -n "$API_KEY" ]; then
        # Write .env with the key
        cat > "$INSTALL_DIR/.env" << ENVEOF
# ULTIMATE — Living Intelligence Entity
# API Key configured during installation

# OpenRouter API Key
OPENROUTER_API_KEY=$API_KEY

# Model (default: deepseek/deepseek-v4-flash:free)
# ULTIMATE_MODEL=deepseek/deepseek-v4-flash:free

# Alternative: Anthropic direct
# ANTHROPIC_API_KEY=sk-ant-...

# Force plain console mode
# ULTIMATE_PLAIN=1
ENVEOF
        echo -e "${GREEN}✓ API key saved to $INSTALL_DIR/.env${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped. Configure later: nano $INSTALL_DIR/.env${NC}"
    fi
}

# Print success
print_success() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          ULTIMATE Installed Successfully!       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${CYAN}Run:${NC}    ultimate"
    echo -e "  ${CYAN}TUI:${NC}    ultimate (in terminal)"
    echo -e "  ${CYAN}API:${NC}    ULTIMATE_API=1 ultimate"
    echo -e "  ${CYAN}Plain:${NC}  ULTIMATE_PLAIN=1 ultimate"
    echo ""
    echo -e "  ${CYAN}Config:${NC} $INSTALL_DIR/.env"
    echo -e "  ${CYAN}Dir:${NC}    $INSTALL_DIR"
    echo ""
    echo -e "  ${YELLOW}Commands:${NC}"
    echo -e "    /help      Show all commands"
    echo -e "    /status    System status"
    echo -e "    /theme     Cycle themes"
    echo -e "    /exit      Exit"
    echo ""
    echo -e "  ${MAGENTA}Documentation:${NC} https://github.com/ranker-002/absolute"
    echo ""
}

# Main
check_deps
install_ultimate
setup_bin
setup_config
print_success
