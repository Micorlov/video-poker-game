#!/usr/bin/env python3
"""
Video Poker - Jacks or Better
A complete terminal-based video poker game with proper hand evaluation.
"""

import random
import sys

# Card suits and ranks
SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

# Payout table for Jacks or Better (1 credit bet)
PAYOUTS = {
    'Royal Flush': 250,
    'Straight Flush': 50,
    'Four of a Kind': 25,
    'Full House': 9,
    'Flush': 6,
    'Straight': 4,
    'Three of a Kind': 3,
    'Two Pair': 2,
    'Jacks or Better': 1,
    'Nothing': 0
}


def create_deck():
    """Create a standard 52-card deck."""
    return [(rank, suit) for suit in SUITS for rank in RANKS]


def shuffle_deck(deck):
    """Shuffle the deck."""
    random.shuffle(deck)


def deal_hand(deck, count=5):
    """Deal cards from the deck."""
    return [deck.pop() for _ in range(count)]


def display_hand(hand, highlight=None, winning=None):
    """Display the hand in a nice format."""
    highlight = highlight or set()
    winning = winning or set()
    display = []
    for i, (rank, suit) in enumerate(hand):
        card = f"{rank}{suit}"
        if i in winning:
            display.append(f"★ {card} ★")  # Winning cards marked with stars
        elif i in highlight:
            display.append(f"[{card}]")  # Highlighted for hold
        else:
            display.append(f" {card} ")
    print("  ".join(display))


def evaluate_hand(hand):
    """Evaluate the hand and return (hand_type, win_indices)"""
    ranks = [card[0] for card in hand]
    suits = [card[1] for card in hand]
    
    # Count occurrences of each rank
    rank_counts = {}
    for r in ranks:
        rank_counts[r] = rank_counts.get(r, 0) + 1
    counts = sorted(rank_counts.values(), reverse=True)
    
    # Check for flush (all same suit)
    is_flush = len(set(suits)) == 1
    
    # Check for straight
    rank_values = {'A': 14, 'J': 11, 'Q': 12, 'K': 13}
    for r in RANKS[1:10]:  # 2-10 (skip A which is already defined)
        rank_values[r] = int(r)
    
    values = sorted([rank_values[r] for r in ranks])
    
    # Handle Ace-low straight (A, 2, 3, 4, 5)
    is_straight = False
    if len(set(values)) == 5:  # All different ranks
        if values[-1] - values[0] == 4:
            is_straight = True
        elif set(values) == {14, 2, 3, 4, 5}:  # Wheel straight
            is_straight = True
            values = [1, 2, 3, 4, 5]
    
    pairs = [r for r, c in rank_counts.items() if c == 2]
    
    # Helper to find indices of cards matching certain ranks
    def find_indices(target_ranks):
        return [i for i, card in enumerate(hand) if card[0] in target_ranks]
    
    def find_indices_by_count(target_count):
        target_ranks = [r for r, c in rank_counts.items() if c == target_count]
        return find_indices(target_ranks)
    
    all_indices = [0, 1, 2, 3, 4]
    
    # Determine hand type with winning card indices
    if is_straight and is_flush:
        if values == [10, 11, 12, 13, 14]:  # 10, J, Q, K, A
            return 'Royal Flush', all_indices
        return 'Straight Flush', all_indices
    elif counts[0] == 4:
        return 'Four of a Kind', find_indices_by_count(4)
    elif counts == [3, 2]:
        return 'Full House', all_indices
    elif is_flush:
        return 'Flush', all_indices
    elif is_straight:
        return 'Straight', all_indices
    elif counts[0] == 3:
        return 'Three of a Kind', find_indices_by_count(3)
    elif counts == [2, 2, 1]:
        # Two Pair - all 4 cards in pairs
        pair_ranks = [r for r, c in rank_counts.items() if c == 2]
        return 'Two Pair', find_indices(pair_ranks)
    elif counts == [2, 1, 1, 1]:
        # Jacks or Better - pair of Jacks, Queens, Kings, or Aces
        if any(p in pairs for p in ['J', 'Q', 'K', 'A']):
            pair_rank = [p for p in pairs if p in ['J', 'Q', 'K', 'A']][0]
            return 'Jacks or Better', find_indices([pair_rank])
        return 'Nothing', []
    else:
        return 'Nothing', []


def get_hold_indices():
    """Get which cards to hold from user input."""
    print("\nWhich cards would you like to HOLD? (Enter card numbers separated by spaces, e.g., '1 2 5')")
    print("Enter '0' to discard all, 'h' for help")
    
    while True:
        try:
            user_input = input("> ").strip().lower()
            
            if user_input in ['h', 'help']:
                print("  Enter the positions of cards to hold (1-5)")
                print("  Example: '1 3 4' holds cards 1, 3, and 4")
                print("  Example: '0' discards all cards")
                print("  Example: '5' holds only the 5th card")
                continue
            
            if user_input == '':
                continue
            
            indices = [int(x) for x in user_input.split()]
            
            # Validate indices
            if all(0 <= i <= 5 for i in indices):
                # Convert to 0-based indices
                hold = set(i - 1 for i in indices if i > 0)
                return hold
            else:
                print("Please enter numbers 1-5 only")
        except ValueError:
            print("Please enter valid numbers separated by spaces")


def play_game():
    """Main game loop."""
    print("=" * 50)
    print("  VIDEO POKER - JACKS OR BETTER")
    print("=" * 50)
    print("\nPayouts (for 1 credit bet):")
    for hand, payout in PAYOUTS.items():
        print(f"  {hand:20s}: {payout} credits")
    print()
    
    balance = 100
    game_deck = create_deck()
    shuffle_deck(game_deck)
    
    while balance > 0:
        print(f"\nCurrent balance: {balance} credits")
        
        # Get bet amount
        while True:
            try:
                bet_input = input("Enter bet amount (or 'q' to quit): ").strip()
                if bet_input.lower() in ['q', 'quit', 'exit']:
                    print(f"\nThanks for playing! Final balance: {balance} credits")
                    return
                
                bet = int(bet_input)
                if 1 <= bet <= balance and bet <= 5:
                    balance -= bet
                    break
                else:
                    print(f"Bet must be between 1 and {min(balance, 5)}")
            except ValueError:
                print("Please enter a valid number")
        
        # Deal initial hand
        game_deck = create_deck()  # Fresh deck
        shuffle_deck(game_deck)
        hand = deal_hand(game_deck)
        
        print("\n  Your hand:")
        for i, (rank, suit) in enumerate(hand):
            print(f"  {i+1}. {rank}{suit}")
        
        # Draw phase
        hold = get_hold_indices()
        
        # Draw replacement cards
        if len(hold) < 5:
            for i in range(5):
                if i not in hold:
                    hand[i] = game_deck.pop()
        
        print("\n  Final hand:")
        # Evaluate and payout
        hand_type, win_indices = evaluate_hand(hand)
        win = bet * PAYOUTS[hand_type]
        balance += win
        
        # Display final hand with winning cards highlighted
        display_hand(hand, hold, set(win_indices))
        
        print(f"\n  Hand: {hand_type}")
        if win_indices:
            winning_cards = [f"{hand[i][0]}{hand[i][1]}" for i in win_indices]
            print(f"  Winning cards: {', '.join(winning_cards)}")
        print(f"  Win: {win} credits")
        print(f"  New balance: {balance} credits")


if __name__ == '__main__':
    try:
        play_game()
    except KeyboardInterrupt:
        print("\n\nGame interrupted. Goodbye!")
        sys.exit(0)