import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-profile-settings',
  template: `
    <div class="profile">
      <h2 class="profile__title">Profile Settings</h2>

      <div class="card profile__section">
        <h3>Personal Information</h3>
        <div class="profile__form">
          <div class="form-group">
            <label class="form-label" for="name">Full Name</label>
            <input class="form-input" id="name" type="text" value="Atlas User" />
          </div>
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input class="form-input" id="email" type="email" value="user&#64;bmoatlas.dev" />
          </div>
          <div class="form-group">
            <label class="form-label" for="bio">Bio</label>
            <textarea class="form-input form-textarea" id="bio" placeholder="Tell us about yourself..."></textarea>
          </div>
        </div>
      </div>

      <div class="card profile__section">
        <h3>Security</h3>
        <div class="profile__form">
          <div class="form-group">
            <label class="form-label" for="current-password">Current Password</label>
            <input class="form-input" id="current-password" type="password" />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-password">New Password</label>
            <input class="form-input" id="new-password" type="password" />
          </div>
        </div>
        <button class="btn btn--primary" style="margin-top: var(--space-md)">Update Password</button>
      </div>
    </div>
  `,
  styles: [`
    .profile__title {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      margin-bottom: var(--space-lg);
    }
    .profile__section {
      margin-bottom: var(--space-lg);
    }
    .profile__section h3 {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-md);
    }
    .profile__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      max-width: 480px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettings {}
