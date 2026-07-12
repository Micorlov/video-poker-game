"""
Video Poker Reel - Manim Animation Script
Vertical format (9:16) for Reels/TikTok
"""

from manim import *

# Config for vertical video (Reels/TikTok format)
config.pixel_width = 1080
config.pixel_height = 1920
config.frame_rate = 30
config.background_color = "#0D1B12"

# Color Palette - Casino Theme
BG = "#0D1B12"           # Dark casino green
FELT = "#0C2317"         # Table felt
GOLD = "#FFD700"         # Gold - highlights, wins
GOLD_DIM = "#E6C200"     # Darker gold
ORANGE = "#FF6B35"       # Orange - buttons, actions
GREEN = "#4ADE80"        # Green - wins, balance
RED_CARD = "#E63946"     # Red cards (hearts/diamonds)
BLACK_CARD = "#1A1A1A"   # Black cards (spades/clubs)
WHITE = "#F5F5F5"        # Text
GRAY = "#888888"         # Secondary text
DIM = "#444444"          # Disabled elements

# Typography
TITLE_SIZE = 56
HEADING_SIZE = 42
BODY_SIZE = 32
LABEL_SIZE = 26
CAPTION_SIZE = 22

MONO = "Monospace"  # Monospace for all text

# Timing
FAST = 0.4
NORMAL = 0.8
SLOW = 1.5
PAUSE = 0.5

# Card dimensions (scaled for vertical)
CARD_W = 140
CARD_H = 200
CARD_RADIUS = 15


class Card(VGroup):
    """Playing card mobject"""
    def __init__(self, rank, suit, face_up=True, **kwargs):
        super().__init__(**kwargs)
        self.rank = rank
        self.suit = suit
        self.face_up = face_up
        
        # Card background
        self.bg = RoundedRectangle(
            width=CARD_W, height=CARD_H,
            corner_radius=CARD_RADIUS,
            fill_color=WHITE if face_up else GOLD,
            fill_opacity=1,
            stroke_color=GOLD if face_up else GOLD_DIM,
            stroke_width=3
        )
        
        if face_up:
            # Suit symbol
            suit_symbol = {"♠": "♠", "♥": "♥", "♦": "♦", "♣": "♣"}[suit]
            suit_color = RED_CARD if suit in ["♥", "♦"] else BLACK_CARD
            
            # Rank text
            rank_text = Text(rank, font_size=48, font=MONO, weight=BOLD, color=suit_color)
            suit_text = Text(suit_symbol, font_size=72, font=MONO, color=suit_color)
            
            # Top-left rank/suit
            tl_group = VGroup(rank_text, suit_text).arrange(DOWN, buff=2)
            tl_group.move_to(self.bg.get_corner(UL) + RIGHT * 20 + DOWN * 20)
            
            # Center large suit
            center_suit = Text(suit_symbol, font_size=100, font=MONO, color=suit_color)
            center_suit.move_to(self.bg.get_center())
            
            # Bottom-right (rotated 180)
            br_group = VGroup(
                Text(rank, font_size=48, font=MONO, weight=BOLD, color=suit_color),
                Text(suit_symbol, font_size=72, font=MONO, color=suit_color)
            ).arrange(UP, buff=2)
            br_group.move_to(self.bg.get_corner(DR) + LEFT * 20 + UP * 20)
            br_group.rotate(PI)
            
            self.add(self.bg, tl_group, center_suit, br_group)
        else:
            # Card back - gold pattern
            back_pattern = Text("◆", font_size=60, font=MONO, color=GOLD_DIM)
            back_pattern.move_to(self.bg.get_center())
            self.add(self.bg, back_pattern)
    
    def flip(self, face_up=True, **kwargs):
        """Animate card flip"""
        if self.face_up == face_up:
            return Succession()
        
        new_card = Card(self.rank, self.suit, face_up=face_up)
        new_card.move_to(self.get_center())
        
        # Scale X animation to simulate flip
        def update_card(mob, alpha):
            scale_x = 1 - 2 * alpha if alpha < 0.5 else 2 * alpha - 1
            mob.stretch_to_fit_width(CARD_W * abs(scale_x))
            if alpha < 0.5:
                mob.become(self)
            else:
                mob.become(new_card)
        
        return UpdateFromAlphaFunc(self, update_card, **kwargs)
    
    def set_held(self, held=True):
        """Add/remove held glow"""
        if held:
            glow = self.bg.copy()
            glow.set_stroke(GOLD, width=6)
            glow.set_fill(opacity=0)
            self.add_to_back(glow)
            self.held_glow = glow
        elif hasattr(self, 'held_glow'):
            self.remove(self.held_glow)
            delattr(self, 'held_glow')
    
    def set_winning(self, winning=True):
        """Add/remove winning glow"""
        if winning:
            glow = self.bg.copy()
            glow.set_stroke(GREEN, width=8)
            glow.set_fill(opacity=0)
            self.add_to_back(glow)
            self.win_glow = glow
        elif hasattr(self, 'win_glow'):
            self.remove(self.win_glow)
            delattr(self, 'win_glow')


def create_deck():
    """Create a standard deck"""
    suits = ['♠', '♥', '♦', '♣']
    ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    deck = []
    for suit in suits:
        for rank in ranks:
            deck.append((rank, suit))
    return deck


# ============================================================
# SCENE 1: HOOK - ROYAL FLUSH REVEAL
# ============================================================
class Scene1_Hook(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        # Title card
        title = Text("VIDEO POKER", font_size=TITLE_SIZE, font=MONO, weight=BOLD)
        title.set_color_by_gradient(GOLD, GOLD_DIM, GOLD)
        subtitle = Text("Jacks or Better", font_size=HEADING_SIZE, font=MONO, color=WHITE)
        VGroup(title, subtitle).arrange(DOWN, buff=10).to_edge(UP, buff=80)
        
        # Royal Flush cards
        royal_cards = [
            Card('10', '♥'), Card('J', '♥'), Card('Q', '♥'), Card('K', '♥'), Card('A', '♥')
        ]
        hand = VGroup(*royal_cards).arrange(RIGHT, buff=15)
        hand.move_to(ORIGIN)
        
        # Start face down
        for card in royal_cards:
            card.bg.set_fill(GOLD, opacity=1)
            back = Text("◆", font_size=60, font=MONO, color=GOLD_DIM)
            back.move_to(card.bg.get_center())
            card.add(back)
        
        # Win text
        win_text = Text("ROYAL FLUSH!", font_size=HEADING_SIZE, font=MONO, weight=BOLD)
        win_text.set_color_by_gradient(GOLD, GOLD_DIM, GOLD)
        win_text.next_to(hand, DOWN, buff=40)
        
        credit_text = Text("+250 CREDITS", font_size=48, font=MONO, weight=BOLD, color=GREEN)
        credit_text.next_to(win_text, DOWN, buff=20)
        
        # Animations
        self.play(FadeIn(title, shift=UP*30), run_time=1)
        self.play(FadeIn(subtitle, shift=UP*20), run_time=0.8)
        self.wait(0.3)
        
        # Deal cards face down
        self.play(
            *[card.animate.move_to(hand[i].get_center()).scale(0.8) for i, card in enumerate(royal_cards)],
            run_time=0.5
        )
        
        # Flip cards one by one
        for i, card in enumerate(royal_cards):
            new_card = Card(royal_cards[i].rank, royal_cards[i].suit, face_up=True)
            new_card.move_to(card.get_center())
            new_card.scale(0.8)
            
            self.play(
                Transform(card, new_card),
                run_time=0.4
            )
            self.wait(0.1)
        
        # Gold glow on all cards
        glows = []
        for card in royal_cards:
            glow = card.bg.copy()
            glow.set_stroke(GOLD, width=8)
            glow.set_fill(opacity=0)
            card.add_to_back(glow)
            glows.append(glow)
        
        self.play(
            *[glow.animate.set_stroke(GOLD, width=12).set_opacity(0.8) for glow in glows],
            run_time=0.6
        )
        
        # Win text appears
        self.play(
            Write(win_text, run_time=0.8),
            run_time=0.8
        )
        self.wait(0.2)
        
        # Credit counter animation - use Text with ValueTracker
        from manim import ValueTracker
        
        counter_tracker = ValueTracker(0)
        counter = always_redraw(lambda: Text(
            f"+{int(counter_tracker.get_value())} CREDITS",
            font_size=48, font=MONO, weight=BOLD, color=GREEN
        ).move_to(credit_text.get_center()))
        
        self.play(FadeIn(counter), FadeOut(credit_text), run_time=0.3)
        self.play(
            counter_tracker.animate.set_value(250),
            run_time=1.5,
            rate_func=rush_from
        )
        self.wait(1.5)
        
        # Fade out
        self.play(
            FadeOut(VGroup(title, subtitle, hand, win_text, counter)),
            run_time=0.5
        )


# ============================================================
# SCENE 2: TITLE & BET SELECTION
# ============================================================
class Scene2_BetSelect(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        # Title
        title = Text("VIDEO POKER", font_size=TITLE_SIZE, font=MONO, weight=BOLD)
        title.set_color_by_gradient(GOLD, GOLD_DIM, GOLD)
        subtitle = Text("Jacks or Better", font_size=HEADING_SIZE, font=MONO, color=WHITE)
        VGroup(title, subtitle).arrange(DOWN, buff=10).to_edge(UP, buff=100)
        
        # Balance
        balance_bg = RoundedRectangle(width=300, height=80, corner_radius=15)
        balance_bg.set_fill(FELT, opacity=0.9)
        balance_bg.set_stroke(GOLD, width=2)
        balance_text = Text("BALANCE: 100", font_size=36, font=MONO, weight=BOLD, color=GOLD)
        balance_group = VGroup(balance_bg, balance_text)
        balance_group.to_corner(UR, buff=40)
        
        # Bet buttons
        bet_label = Text("SELECT BET", font_size=LABEL_SIZE, font=MONO, color=GRAY)
        bet_label.to_edge(UP, buff=220)
        
        bet_buttons = VGroup()
        for i in range(1, 6):
            btn_bg = RoundedRectangle(width=100, height=70, corner_radius=12)
            if i == 5:
                btn_bg.set_fill(GOLD, opacity=1)
                btn_bg.set_stroke(GOLD_DIM, width=3)
                btn_text = Text(str(i), font_size=36, font=MONO, weight=BOLD, color=BG)
            else:
                btn_bg.set_fill(DIM, opacity=0.8)
                btn_bg.set_stroke(GRAY, width=2)
                btn_text = Text(str(i), font_size=36, font=MONO, color=WHITE)
            btn = VGroup(btn_bg, btn_text)
            bet_buttons.add(btn)
        
        bet_buttons.arrange(RIGHT, buff=15)
        bet_buttons.next_to(bet_label, DOWN, buff=20)
        
        # "CREDITS" label
        credit_label = Text("CREDITS", font_size=CAPTION_SIZE, font=MONO, color=GRAY)
        credit_label.next_to(bet_buttons, DOWN, buff=15)
        
        # Animations
        self.play(FadeIn(title, shift=DOWN*20), run_time=0.8)
        self.play(FadeIn(subtitle, shift=DOWN*15), run_time=0.6)
        self.wait(0.3)
        
        self.play(FadeIn(balance_group, shift=LEFT*30), run_time=0.5)
        self.play(FadeIn(bet_label, shift=UP*20), run_time=0.4)
        
        # Stagger bet buttons
        for i, btn in enumerate(bet_buttons):
            self.play(FadeIn(btn, scale=0.5), run_time=0.15)
        
        self.play(FadeIn(credit_label), run_time=0.3)
        self.wait(0.3)
        
        # Highlight bet 5
        self.play(
            bet_buttons[4][0].animate.set_fill(GOLD, opacity=1).set_stroke(GOLD_DIM, 3),
            bet_buttons[4][1].animate.set_color(BG),
            run_time=0.4
        )
        
        # Pulse animation on selected bet
        pulse = bet_buttons[4][0].copy()
        pulse.set_stroke(GOLD, width=8).set_fill(opacity=0)
        self.add(pulse)
        self.play(
            pulse.animate.scale(1.3).set_opacity(0),
            run_time=0.8
        )
        self.remove(pulse)
        
        self.wait(1)
        
        # Fade out
        self.play(
            FadeOut(VGroup(title, subtitle, balance_group, bet_label, bet_buttons, credit_label)),
            run_time=0.5
        )


# ============================================================
# SCENE 3: DEAL & INITIAL HAND
# ============================================================
class Scene3_Deal(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        # Balance display
        balance_text = Text("BALANCE: 100  |  BET: 5", font_size=28, font=MONO, color=WHITE)
        balance_text.to_edge(UP, buff=60)
        
        # Deal button area
        deal_btn = RoundedRectangle(width=200, height=70, corner_radius=15)
        deal_btn.set_fill(GREEN, opacity=1)
        deal_btn.set_stroke(GREEN, width=3)
        deal_text = Text("DEAL", font_size=32, font=MONO, weight=BOLD, color=BG)
        deal_btn_group = VGroup(deal_btn, deal_text)
        deal_btn_group.to_edge(DOWN, buff=100)
        
        # Initial hand (pair of Jacks + 3 random)
        hand_cards = [
            Card('J', '♥'), Card('J', '♠'), Card('7', '♦'), Card('K', '♣'), Card('2', '♠')
        ]
        hand = VGroup(*hand_cards).arrange(RIGHT, buff=12)
        hand.move_to(ORIGIN)
        hand.scale(0.7)
        
        # Start face down
        face_down_cards = VGroup()
        for card in hand_cards:
            fd = Card('?', '?', face_up=False)
            fd.scale(0.7)
            face_down_cards.add(fd)
        face_down_cards.arrange(RIGHT, buff=12)
        face_down_cards.move_to(ORIGIN)
        
        # "HOLD?" indicators on Jacks
        hold_indicators = VGroup()
        for i in [0, 1]:  # Jacks
            indicator = VGroup(
                Text("HOLD?", font_size=20, font=MONO, weight=BOLD, color=GOLD),
                Triangle().scale(0.3).set_fill(GOLD, opacity=1).set_stroke(width=0).rotate(-PI/2)
            ).arrange(DOWN, buff=5)
            indicator.next_to(hand_cards[i], UP, buff=15)
            hold_indicators.add(indicator)
        
        # Animations
        self.play(FadeIn(balance_text), run_time=0.4)
        self.play(FadeIn(deal_btn_group, shift=UP*20), run_time=0.4)
        self.wait(0.3)
        
        # Press deal button
        self.play(deal_btn.animate.set_fill(GREEN, opacity=0.7).scale(0.95), run_time=0.1)
        self.play(deal_btn.animate.set_fill(GREEN, opacity=1).scale(1/0.95), run_time=0.1)
        
        # Deal cards from bottom
        for i, fd_card in enumerate(face_down_cards):
            fd_card.move_to(deal_btn_group.get_center() + UP * 200)
            self.add(fd_card)
            self.play(
                fd_card.animate.move_to(hand_cards[i].get_center()),
                run_time=0.3,
                rate_func=rush_from
            )
            self.wait(0.05)
        
        self.wait(0.3)
        
        # Flip cards
        for i, (fd_card, real_card) in enumerate(zip(face_down_cards, hand_cards)):
            real_card.scale(0.7)
            real_card.move_to(fd_card.get_center())
            
            self.play(
                Transform(fd_card, real_card),
                run_time=0.35
            )
            self.wait(0.08)
        
        # Show HOLD indicators on Jacks
        self.play(
            *[FadeIn(ind, shift=DOWN*10) for ind in hold_indicators],
            run_time=0.5
        )
        
        # Gold border on Jacks
        for i in [0, 1]:
            glow = hand_cards[i].bg.copy()
            glow.set_stroke(GOLD, width=5)
            glow.set_fill(opacity=0)
            hand_cards[i].add_to_back(glow)
            self.play(glow.animate.set_stroke(GOLD, width=8), run_time=0.3)
        
        self.wait(1.5)
        
        # Fade out
        self.play(
            FadeOut(VGroup(balance_text, deal_btn_group, face_down_cards, hold_indicators)),
            run_time=0.5
        )


# ============================================================
# SCENE 4: HOLD & DRAW
# ============================================================
class Scene4_HoldDraw(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        # Hand with held Jacks
        held_cards = [Card('J', '♥'), Card('J', '♠')]
        new_cards = [Card('Q', '♥'), Card('K', '♥'), Card('A', '♥')]  # Will make Royal Flush!
        
        all_cards = held_cards + new_cards
        hand = VGroup(*all_cards).arrange(RIGHT, buff=12)
        hand.move_to(ORIGIN)
        hand.scale(0.7)
        
        # Start with all 5 cards (face up, first 2 held)
        for i, card in enumerate(all_cards):
            if i < 2:
                card.set_held(True)
            else:
                card.set_opacity(0.4)  # Dimmed - will be discarded
        
        # Draw button
        draw_btn = RoundedRectangle(width=200, height=70, corner_radius=15)
        draw_btn.set_fill(ORANGE, opacity=1)
        draw_btn.set_stroke(ORANGE, width=3)
        draw_text = Text("DRAW", font_size=32, font=MONO, weight=BOLD, color=BG)
        draw_btn_group = VGroup(draw_btn, draw_text)
        draw_btn_group.to_edge(DOWN, buff=100)
        
        # Discard animation
        self.play(FadeIn(hand, shift=UP*20), FadeIn(draw_btn_group, shift=UP*20), run_time=0.5)
        self.wait(0.3)
        
        # Press draw
        self.play(draw_btn.animate.set_fill(ORANGE, opacity=0.7).scale(0.95), run_time=0.1)
        self.play(draw_btn.animate.set_fill(ORANGE, opacity=1).scale(1/0.95), run_time=0.1)
        
        # Unheld cards slide out
        for i in [2, 3, 4]:
            self.play(
                all_cards[i].animate.shift(DOWN * 300).set_opacity(0),
                run_time=0.4,
                rate_func=rush_into
            )
        
        self.wait(0.2)
        
        # New cards slide in from deck (bottom center)
        deck_pos = draw_btn_group.get_center() + UP * 100
        for i, new_card in enumerate(new_cards):
            new_card.scale(0.7)
            new_card.move_to(deck_pos)
            self.add(new_card)
            target_pos = all_cards[i+2].get_center()
            
            self.play(
                new_card.animate.move_to(target_pos),
                run_time=0.35,
                rate_func=rush_from
            )
            # Flip animation
            face_down = Card('?', '?', face_up=False)
            face_down.scale(0.7)
            face_down.move_to(new_card.get_center())
            
            self.play(Transform(face_down, new_card), run_time=0.3)
            self.remove(face_down)
            self.wait(0.08)
        
        # Now we have Royal Flush! Highlight all
        self.wait(0.3)
        
        # Green glow on all winning cards
        for card in all_cards:
            card.set_winning(True)
        
        self.play(
            *[card.win_glow.animate.set_stroke(GREEN, width=10) for card in all_cards],
            run_time=0.6
        )
        
        self.wait(1)
        
        # Fade out
        self.play(FadeOut(VGroup(hand, draw_btn_group)), run_time=0.5)


# ============================================================
# SCENE 5: WIN REVEAL WITH EXPLANATION
# ============================================================
class Scene5_WinReveal(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        # Final hand - Royal Flush
        cards = [Card(r, '♥') for r in ['10', 'J', 'Q', 'K', 'A']]
        hand = VGroup(*cards).arrange(RIGHT, buff=12)
        hand.move_to(UP * 100)
        hand.scale(0.7)
        
        for card in cards:
            card.set_winning(True)
        
        # Win type
        win_type = Text("ROYAL FLUSH!", font_size=HEADING_SIZE, font=MONO, weight=BOLD)
        win_type.set_color_by_gradient(GOLD, GOLD_DIM, GOLD)
        win_type.next_to(hand, DOWN, buff=40)
        
        # Explanation
        explanation = Text(
            "10-J-Q-K-A all same suit!\nHighest hand in poker!",
            font_size=BODY_SIZE, font=MONO, color=WHITE,
            line_spacing=1.2
        )
        explanation.next_to(win_type, DOWN, buff=25)
        
        # Payout
        payout_bg = RoundedRectangle(width=400, height=100, corner_radius=20)
        payout_bg.set_fill(FELT, opacity=0.9)
        payout_bg.set_stroke(GREEN, width=3)
        
        payout_text = VGroup(
            Text("PAYOUT", font_size=LABEL_SIZE, font=MONO, color=GRAY),
            Text("5 × 250 = 1,250", font_size=42, font=MONO, weight=BOLD, color=GREEN)
        ).arrange(DOWN, buff=8)
        payout_group = VGroup(payout_bg, payout_text)
        payout_group.next_to(explanation, DOWN, buff=30)
        
        # Balance update
        balance_text = Text("BALANCE: 100 → 1,350", font_size=32, font=MONO, weight=BOLD, color=GOLD)
        balance_text.next_to(payout_group, DOWN, buff=30)
        
        # Animations
        self.play(FadeIn(hand, shift=UP*30), run_time=0.6)
        
        # Pulse win glow
        self.play(
            *[card.win_glow.animate.set_stroke(GREEN, width=12) for card in cards],
            run_time=0.5
        )
        
        self.play(Write(win_type, run_time=0.8), run_time=0.8)
        self.wait(0.3)
        
        self.play(FadeIn(explanation, shift=UP*20), run_time=0.6)
        self.wait(0.2)
        
        self.play(FadeIn(payout_group, shift=UP*20), run_time=0.5)
        self.wait(0.2)
        
        # Counter animation using ValueTracker
        tracker = ValueTracker(100)
        counter = always_redraw(lambda: Text(
            str(int(tracker.get_value())),
            font_size=32, font=MONO, weight=BOLD, color=GOLD
        ).move_to(balance_text.get_center()))
        
        self.play(FadeIn(counter), FadeOut(balance_text), run_time=0.3)
        self.play(
            tracker.animate.set_value(1350),
            run_time=1.5,
            rate_func=rush_from
        )
        
        self.wait(1.5)
        
        # Confetti burst
        confetti = VGroup()
        for _ in range(30):
            c = Square(side_length=8).set_fill(random_bright_color(), opacity=1).set_stroke(width=0)
            c.move_to(hand.get_center() + UP * 100)
            confetti.add(c)
        
        self.add(confetti)
        self.play(
            *[c.animate.shift(DOWN * 1200 + RIGHT * np.random.uniform(-400, 400)).set_opacity(0) for c in confetti],
            run_time=2,
            rate_func=rush_into
        )
        
        self.play(FadeOut(VGroup(hand, win_type, explanation, payout_group, counter)), run_time=0.5)


# ============================================================
# SCENE 6: PAYOUT TABLE
# ============================================================
class Scene6_PayoutTable(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        title = Text("PAYOUTS (5 CREDIT BET)", font_size=36, font=MONO, weight=BOLD, color=GOLD)
        title.to_edge(UP, buff=80)
        
        payouts = [
            ("Royal Flush", "1,250"),
            ("Straight Flush", "250"),
            ("Four of a Kind", "125"),
            ("Full House", "45"),
            ("Flush", "30"),
            ("Straight", "20"),
            ("Three of a Kind", "15"),
            ("Two Pair", "10"),
            ("Jacks or Better", "5"),
            ("High Pair", "5"),
            ("Nothing", "0"),
        ]
        
        rows = VGroup()
        for i, (hand, payout) in enumerate(payouts):
            row_bg = Rectangle(width=800, height=60)
            if i % 2 == 0:
                row_bg.set_fill("#1A2F1F", opacity=0.8)
            else:
                row_bg.set_fill("#0C2317", opacity=0.9)
            row_bg.set_stroke(width=0)
            
            hand_text = Text(hand, font_size=26, font=MONO, color=WHITE)
            hand_text.move_to(row_bg.get_center() + LEFT * 250)
            
            payout_text = Text(payout, font_size=28, font=MONO, weight=BOLD, color=GOLD)
            payout_text.move_to(row_bg.get_center() + RIGHT * 250)
            
            # Highlight Jacks or Better
            if hand == "Jacks or Better":
                highlight = Text("★ ANY PAIR PAYS! ★", font_size=20, font=MONO, color=GREEN)
                highlight.next_to(row_bg, RIGHT, buff=20)
                row_bg.add(highlight)
                row_bg.set_stroke(GREEN, width=3)
            
            row = VGroup(row_bg, hand_text, payout_text)
            rows.add(row)
        
        rows.arrange(DOWN, buff=5)
        rows.next_to(title, DOWN, buff=30)
        
        # Win rate badge
        win_badge = RoundedRectangle(width=300, height=60, corner_radius=30)
        win_badge.set_fill(GREEN, opacity=0.2)
        win_badge.set_stroke(GREEN, width=3)
        win_text = Text("~20% WIN RATE", font_size=28, font=MONO, weight=BOLD, color=GREEN)
        badge_group = VGroup(win_badge, win_text)
        badge_group.next_to(rows, DOWN, buff=30)
        
        # Animate
        self.play(FadeIn(title, shift=DOWN*20), run_time=0.5)
        
        for i, row in enumerate(rows):
            self.play(FadeIn(row, shift=RIGHT*50), run_time=0.15)
        
        self.wait(0.3)
        self.play(FadeIn(badge_group, scale=0.5), run_time=0.5)
        
        # Pulse the badge
        self.play(
            win_badge.animate.scale(1.1).set_fill(GREEN, opacity=0.4),
            run_time=0.5
        )
        self.play(
            win_badge.animate.scale(1/1.1).set_fill(GREEN, opacity=0.2),
            run_time=0.5
        )
        
        self.wait(1)
        self.play(FadeOut(VGroup(title, rows, badge_group)), run_time=0.5)


# ============================================================
# SCENE 7: CALL TO ACTION
# ============================================================
class Scene7_CTA(Scene):
    def construct(self):
        self.camera.background_color = BG
        
        # Main text
        main_text = VGroup(
            Text("PLAY NOW", font_size=64, font=MONO, weight=BOLD),
            Text("Jacks or Better", font_size=36, font=MONO, color=GRAY),
            Text("Any Pair Wins!", font_size=42, font=MONO, weight=BOLD, color=GREEN)
        ).arrange(DOWN, buff=20)
        main_text.move_to(UP * 100)
        
        # Play button
        play_btn = RoundedRectangle(width=300, height=90, corner_radius=25)
        play_btn.set_fill(GOLD, opacity=1)
        play_btn.set_stroke(GOLD_DIM, width=4)
        play_text = Text("PLAY", font_size=42, font=MONO, weight=BOLD, color=BG)
        play_group = VGroup(play_btn, play_text)
        play_group.move_to(ORIGIN)
        
        # QR code placeholder
        qr_bg = Square(side_length=180)
        qr_bg.set_fill(FELT, opacity=1)
        qr_bg.set_stroke(GOLD, width=3)
        qr_text = Text("QR CODE", font_size=24, font=MONO, color=GRAY)
        qr_group = VGroup(qr_bg, qr_text)
        qr_group.move_to(DOWN * 400)
        
        # Footer
        footer = Text("video_poker_game  •  Runs in Browser", font_size=22, font=MONO, color=GRAY)
        footer.to_edge(DOWN, buff=80)
        
        # Animations
        self.play(FadeIn(main_text, shift=UP*30), run_time=0.8)
        self.wait(0.3)
        
        self.play(FadeIn(play_group, scale=0.5), run_time=0.6)
        
        # Pulse play button
        for _ in range(2):
            pulse = play_btn.copy()
            pulse.set_stroke(GOLD, width=10).set_fill(opacity=0)
            self.add(pulse)
            self.play(
                pulse.animate.scale(1.3).set_opacity(0),
                run_time=0.8
            )
            self.remove(pulse)
        
        self.play(FadeIn(qr_group, shift=UP*30), run_time=0.5)
        self.play(FadeIn(footer, shift=UP*20), run_time=0.4)
        
        self.wait(2)


# ============================================================
# MAIN - Render all scenes
# ============================================================
if __name__ == "__main__":
    # This allows running individual scenes
    pass