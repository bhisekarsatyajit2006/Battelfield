import pygame
import math
import random
import sys

# Initialize Pygame
pygame.init()
pygame.mixer.init()

# Constants
SCREEN_WIDTH = 1200
SCREEN_HEIGHT = 800
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)
BLUE = (0, 100, 255)
GRAY = (100, 100, 100)

class Player(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((32, 32), pygame.SRCALPHA)
        # Draw triangle shape
        points = [(16, 0), (0, 32), (32, 32)]
        pygame.draw.polygon(self.image, BLUE, points)
        self.rect = self.image.get_rect(center=(x, y))
        self.position = pygame.math.Vector2(x, y)
        self.angle = 0
        self.health = 100
        self.max_health = 100
        self.speed = 300
        self.last_shot = 0
        self.shoot_delay = 200  # milliseconds

    def update(self, dt):
        keys = pygame.key.get_pressed()
        dx, dy = 0, 0
        
        if keys[pygame.K_w] or keys[pygame.K_UP]:
            dy -= 1
        if keys[pygame.K_s] or keys[pygame.K_DOWN]:
            dy += 1
        if keys[pygame.K_a] or keys[pygame.K_LEFT]:
            dx -= 1
        if keys[pygame.K_d] or keys[pygame.K_RIGHT]:
            dx += 1
            
        if dx != 0 or dy != 0:
            dx, dy = dx, dy
            length = math.sqrt(dx*dx + dy*dy)
            dx /= length
            dy /= length
            
        self.position.x += dx * self.speed * dt
        self.position.y += dy * self.speed * dt
        
        # Keep player in bounds
        self.position.x = max(32, min(SCREEN_WIDTH - 32, self.position.x))
        self.position.y = max(32, min(SCREEN_HEIGHT - 32, self.position.y))
        
        self.rect.center = self.position
        
        # Rotate player to face mouse
        mouse_x, mouse_y = pygame.mouse.get_pos()
        self.angle = math.degrees(math.atan2(mouse_y - self.position.y, mouse_x - self.position.x))
        rotated_image = pygame.transform.rotate(self.image, -self.angle)
        self.rect = rotated_image.get_rect(center=self.rect.center)
        self.image = rotated_image

    def shoot(self):
        current_time = pygame.time.get_ticks()
        if current_time - self.last_shot >= self.shoot_delay:
            self.last_shot = current_time
            # Calculate direction to mouse
            mouse_x, mouse_y = pygame.mouse.get_pos()
            direction = pygame.math.Vector2(mouse_x - self.position.x, mouse_y - self.position.y)
            if direction.length() > 0:
                direction = direction.normalize()
            return Bullet(self.position.x, self.position.y, direction)
        return None

    def take_damage(self, damage):
        self.health -= damage
        return self.health <= 0

    def draw_health(self, screen):
        bar_width = 200
        bar_height = 20
        health_percentage = self.health / self.max_health
        pygame.draw.rect(screen, RED, (10, 10, bar_width, bar_height))
        pygame.draw.rect(screen, GREEN, (10, 10, bar_width * health_percentage, bar_height))

class Bullet(pygame.sprite.Sprite):
    def __init__(self, x, y, direction):
        super().__init__()
        self.image = pygame.Surface((8, 8))
        self.image.fill(YELLOW)
        self.rect = self.image.get_rect(center=(x, y))
        self.position = pygame.math.Vector2(x, y)
        self.direction = direction
        self.speed = 800
        self.life = 2.0  # seconds

    def update(self, dt):
        self.position += self.direction * self.speed * dt
        self.rect.center = self.position
        self.life -= dt
        
        # Remove if off screen or expired
        if (self.position.x < 0 or self.position.x > SCREEN_WIDTH or
            self.position.y < 0 or self.position.y > SCREEN_HEIGHT or
            self.life <= 0):
            self.kill()

class Enemy(pygame.sprite.Sprite):
    def __init__(self, x, y, health=3):
        super().__init__()
        self.size = 24
        self.image = pygame.Surface((self.size, self.size))
        self.image.fill(RED)
        self.rect = self.image.get_rect(center=(x, y))
        self.position = pygame.math.Vector2(x, y)
        self.health = health
        self.max_health = health
        self.speed = 150
        self.damage = 10

    def update(self, dt, player_pos):
        # Move toward player
        direction = player_pos - self.position
        if direction.length() > 0:
            direction = direction.normalize()
            self.position += direction * self.speed * dt
            self.rect.center = self.position
            
        # Update color based on health
        if self.health == 3:
            self.image.fill(RED)
        elif self.health == 2:
            self.image.fill((255, 100, 0))
        elif self.health == 1:
            self.image.fill(YELLOW)

    def take_damage(self, damage=1):
        self.health -= damage
        return self.health <= 0

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Battlefield Gunfight - 2D Mode")
        self.clock = pygame.time.Clock()
        self.running = True
        self.game_over = False
        self.score = 0
        self.spawn_timer = 0
        self.spawn_delay = 1000  # milliseconds
        self.enemies_killed = 0
        
        # Sprite groups
        self.all_sprites = pygame.sprite.Group()
        self.bullets = pygame.sprite.Group()
        self.enemies = pygame.sprite.Group()
        
        # Create player
        self.player = Player(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
        self.all_sprites.add(self.player)
        
        # Fonts
        self.font_large = pygame.font.Font(None, 72)
        self.font_medium = pygame.font.Font(None, 36)
        
    def spawn_enemy(self):
        side = random.choice(['top', 'bottom', 'left', 'right'])
        if side == 'top':
            x = random.randint(0, SCREEN_WIDTH)
            y = -20
        elif side == 'bottom':
            x = random.randint(0, SCREEN_WIDTH)
            y = SCREEN_HEIGHT + 20
        elif side == 'left':
            x = -20
            y = random.randint(0, SCREEN_HEIGHT)
        else:
            x = SCREEN_WIDTH + 20
            y = random.randint(0, SCREEN_HEIGHT)
            
        # Increase health based on score
        health = 3 if self.score < 500 else 4 if self.score < 1000 else 5
        enemy = Enemy(x, y, health)
        self.enemies.add(enemy)
        self.all_sprites.add(enemy)
        
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r and self.game_over:
                    self.reset_game()
                elif event.key == pygame.K_ESCAPE:
                    self.running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1 and not self.game_over:
                    bullet = self.player.shoot()
                    if bullet:
                        self.bullets.add(bullet)
                        self.all_sprites.add(bullet)
                        
    def update(self, dt):
        if self.game_over:
            return
            
        # Update player
        self.player.update(dt)
        
        # Update bullets
        for bullet in self.bullets:
            bullet.update(dt)
            
        # Update enemies
        for enemy in self.enemies:
            enemy.update(dt, self.player.position)
            
        # Check bullet collisions
        for bullet in self.bullets:
            hit_enemies = pygame.sprite.spritecollide(bullet, self.enemies, False)
            for enemy in hit_enemies:
                if enemy.take_damage():
                    enemy.kill()
                    self.score += 20
                    self.enemies_killed += 1
                bullet.kill()
                break
                
        # Check player collisions with enemies
        for enemy in self.enemies:
            if pygame.sprite.collide_rect(self.player, enemy):
                if self.player.take_damage(enemy.damage):
                    self.game_over = True
                enemy.kill()
                
        # Spawn enemies
        current_time = pygame.time.get_ticks()
        if current_time - self.spawn_timer >= self.spawn_delay:
            self.spawn_timer = current_time
            # Increase spawn rate based on score
            spawn_count = min(3, 1 + self.score // 500)
            for _ in range(spawn_count):
                self.spawn_enemy()
            # Decrease spawn delay over time
            self.spawn_delay = max(300, 1000 - (self.enemies_killed // 10))
            
    def draw(self):
        self.screen.fill(BLACK)
        
        # Draw all sprites
        self.all_sprites.draw(self.screen)
        
        # Draw HUD
        self.player.draw_health(self.screen)
        
        # Score text
        score_text = self.font_medium.render(f"Score: {self.score}", True, WHITE)
        self.screen.blit(score_text, (10, 40))
        
        # Enemies remaining
        enemy_text = self.font_medium.render(f"Enemies: {len(self.enemies)}", True, WHITE)
        self.screen.blit(enemy_text, (10, 70))
        
        if self.game_over:
            # Game over screen
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            overlay.set_alpha(128)
            overlay.fill(BLACK)
            self.screen.blit(overlay, (0, 0))
            
            game_over_text = self.font_large.render("GAME OVER", True, RED)
            score_text = self.font_medium.render(f"Final Score: {self.score}", True, WHITE)
            restart_text = self.font_medium.render("Press R to Restart", True, WHITE)
            
            game_over_rect = game_over_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2 - 50))
            score_rect = score_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2))
            restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2 + 50))
            
            self.screen.blit(game_over_text, game_over_rect)
            self.screen.blit(score_text, score_rect)
            self.screen.blit(restart_text, restart_rect)
            
        pygame.display.flip()
        
    def reset_game(self):
        self.game_over = False
        self.score = 0
        self.enemies_killed = 0
        self.spawn_delay = 1000
        self.spawn_timer = pygame.time.get_ticks()
        
        # Clear all sprites
        self.all_sprites.empty()
        self.bullets.empty()
        self.enemies.empty()
        
        # Create new player
        self.player = Player(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)
        self.all_sprites.add(self.player)
        
    def run(self):
        dt = 0
        while self.running:
            dt = self.clock.tick(FPS) / 1000.0
            self.handle_events()
            self.update(dt)
            self.draw()
            
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()