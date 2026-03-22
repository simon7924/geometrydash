import { supabase, signUp, logIn, getCurrentUser } from '../../supabase-browser.js';

export class AuthScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AuthScene' });
        this.isLoginMode = true;
        this.isLoading = false;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Title
        this.add.text(width / 2, 80, 'PULSE DASH', {
            font: 'bold 56px Arial',
            fill: '#00ffff',
            stroke: '#ffffff',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Auth form container
        this.formContainer = this.add.container(width / 2, height / 2);

        // Mode title (Login / Sign Up)
        this.modeTitle = this.add.text(0, -180, 'LOGIN', {
            font: 'bold 36px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.formContainer.add(this.modeTitle);

        // Create HTML form elements
        this.createFormElements();

        // Error/Success message
        this.messageText = this.add.text(0, 140, '', {
            font: '18px Arial',
            fill: '#ff4444',
            wordWrap: { width: 350 }
        }).setOrigin(0.5);
        this.formContainer.add(this.messageText);

        // Submit button
        this.submitButton = this.add.rectangle(0, 200, 280, 50, 0x00aa88)
            .setInteractive({ useHandCursor: true });
        this.formContainer.add(this.submitButton);

        this.submitText = this.add.text(0, 200, 'LOGIN', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.formContainer.add(this.submitText);

        this.submitButton.on('pointerover', () => {
            if (!this.isLoading) this.submitButton.setFillStyle(0x00ccaa);
        });
        this.submitButton.on('pointerout', () => {
            if (!this.isLoading) this.submitButton.setFillStyle(0x00aa88);
        });
        this.submitButton.on('pointerdown', () => this.handleSubmit());

        // Toggle mode link
        this.toggleText = this.add.text(0, 260, "Don't have an account? Sign Up", {
            font: '16px Arial',
            fill: '#00ffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.formContainer.add(this.toggleText);

        this.toggleText.on('pointerover', () => {
            this.toggleText.setStyle({ fill: '#66ffff' });
        });
        this.toggleText.on('pointerout', () => {
            this.toggleText.setStyle({ fill: '#00ffff' });
        });
        this.toggleText.on('pointerdown', () => this.toggleMode());

        // Guest play option
        this.guestText = this.add.text(width / 2, height - 40, 'Play as Guest (progress not saved)', {
            font: '16px Arial',
            fill: '#888888'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.guestText.on('pointerover', () => {
            this.guestText.setStyle({ fill: '#aaaaaa' });
        });
        this.guestText.on('pointerout', () => {
            this.guestText.setStyle({ fill: '#888888' });
        });
        this.guestText.on('pointerdown', () => {
            this.cleanupForm();
            this.scene.start('MenuScene', { user: null, isGuest: true });
        });

        // Loading indicator
        this.loadingText = this.add.text(0, 200, 'Loading...', {
            font: 'bold 24px Arial',
            fill: '#ffff00'
        }).setOrigin(0.5).setVisible(false);
        this.formContainer.add(this.loadingText);
    }

    createFormElements() {
        // Create DOM elements for input fields
        const gameContainer = document.getElementById('game-container');

        // Form wrapper
        this.formElement = document.createElement('div');
        this.formElement.id = 'auth-form';
        this.formElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            gap: 15px;
            z-index: 100;
        `;

        // Username field (hidden in login mode)
        this.usernameInput = document.createElement('input');
        this.usernameInput.type = 'text';
        this.usernameInput.placeholder = 'Username';
        this.usernameInput.style.cssText = this.getInputStyle();
        this.usernameInput.style.display = 'none';
        this.formElement.appendChild(this.usernameInput);

        // Email field
        this.emailInput = document.createElement('input');
        this.emailInput.type = 'email';
        this.emailInput.placeholder = 'Email';
        this.emailInput.style.cssText = this.getInputStyle();
        this.formElement.appendChild(this.emailInput);

        // Password field
        this.passwordInput = document.createElement('input');
        this.passwordInput.type = 'password';
        this.passwordInput.placeholder = 'Password';
        this.passwordInput.style.cssText = this.getInputStyle();
        this.formElement.appendChild(this.passwordInput);

        // Confirm password (hidden in login mode)
        this.confirmPasswordInput = document.createElement('input');
        this.confirmPasswordInput.type = 'password';
        this.confirmPasswordInput.placeholder = 'Confirm Password';
        this.confirmPasswordInput.style.cssText = this.getInputStyle();
        this.confirmPasswordInput.style.display = 'none';
        this.formElement.appendChild(this.confirmPasswordInput);

        gameContainer.appendChild(this.formElement);

        // Handle Enter key
        this.passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSubmit();
        });
        this.confirmPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSubmit();
        });
    }

    getInputStyle() {
        return `
            width: 280px;
            padding: 12px 16px;
            font-size: 16px;
            border: 2px solid #4a4a6a;
            border-radius: 8px;
            background: #2a2a4e;
            color: #ffffff;
            outline: none;
            transition: border-color 0.2s;
        `;
    }

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        this.messageText.setText('');

        if (this.isLoginMode) {
            this.modeTitle.setText('LOGIN');
            this.submitText.setText('LOGIN');
            this.toggleText.setText("Don't have an account? Sign Up");
            this.usernameInput.style.display = 'none';
            this.confirmPasswordInput.style.display = 'none';
        } else {
            this.modeTitle.setText('SIGN UP');
            this.submitText.setText('SIGN UP');
            this.toggleText.setText('Already have an account? Login');
            this.usernameInput.style.display = 'block';
            this.confirmPasswordInput.style.display = 'block';
        }
    }

    async handleSubmit() {
        if (this.isLoading) return;

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const username = this.usernameInput.value.trim();
        const confirmPassword = this.confirmPasswordInput.value;

        // Validation
        if (!email || !password) {
            this.showMessage('Please fill in all fields', true);
            return;
        }

        if (!this.isLoginMode) {
            if (!username) {
                this.showMessage('Please enter a username', true);
                return;
            }
            if (password !== confirmPassword) {
                this.showMessage('Passwords do not match', true);
                return;
            }
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters', true);
                return;
            }
        }

        this.setLoading(true);

        try {
            let result;
            if (this.isLoginMode) {
                result = await logIn(email, password);
            } else {
                result = await signUp(email, password, username);
            }

            if (result.success) {
                if (this.isLoginMode) {
                    this.showMessage('Login successful!', false);
                    this.cleanupForm();
                    this.scene.start('MenuScene', { user: result.user, isGuest: false });
                } else {
                    this.showMessage('Account created! Please check your email to verify.', false);
                    // Switch to login mode after successful signup
                    this.toggleMode();
                }
            } else {
                this.showMessage(result.error || 'An error occurred', true);
            }
        } catch (error) {
            this.showMessage(error.message || 'An error occurred', true);
        }

        this.setLoading(false);
    }

    showMessage(text, isError) {
        this.messageText.setText(text);
        this.messageText.setStyle({ fill: isError ? '#ff4444' : '#44ff44' });
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.submitButton.setVisible(!loading);
        this.submitText.setVisible(!loading);
        this.loadingText.setVisible(loading);

        if (loading) {
            this.submitButton.setFillStyle(0x666666);
        } else {
            this.submitButton.setFillStyle(0x00aa88);
        }
    }

    cleanupForm() {
        if (this.formElement && this.formElement.parentNode) {
            this.formElement.parentNode.removeChild(this.formElement);
        }
    }

    shutdown() {
        this.cleanupForm();
    }
}
