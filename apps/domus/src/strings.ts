/**
 * Every visible text of the app, English: the canonical set. `strings-de.ts` has the same keys
 * and signatures; `lang.ts` chooses one when the app starts (a change of the setting reloads
 * the page). A failure has a sentence in `failures`, and the compiler checks the list is whole.
 */
import type { Failure } from './logic/failures';
import type { JoinError } from './logic/invite';

export interface FailureTexts {
  /** One sentence per failure: what it means and what the person can do. */
  generic: Record<Failure, string>;
  /** Where a failure means something more specific for GitHub or for WebDAV. */
  github: Partial<Record<Failure, string>>;
  webdav: Partial<Record<Failure, string>>;
  /** `server` with the details the host package gives. */
  httpStatus: (status: string) => string;
  rateLimitedUntil: (time: string) => string;
  rateLimited: string;
}

export const stringsEn = {
  appName: 'Household',
  skip: 'Skip to content',
  common: {
    back: 'Back',
    cancel: 'Cancel',
    continue: 'Continue',
    loading: 'Loading…',
    show: 'Show',
    hide: 'Hide',
  },
  display: {
    legend: 'Display',
    language: 'Language',
    langDevice: 'Follow device',
    langEn: 'English',
    langDe: 'Deutsch',
    theme: 'Theme',
    themeSystem: 'Follow device',
    themeLight: 'Light',
    themeDark: 'Dark',
    notSaved: 'The choice could not be kept on this device.',
  },
  time: {
    justNow: 'just now',
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} h ago`,
  },
  home: {
    title: 'Household',
    intro: 'Apps that keep their data on this device. Each one installs on its own.',
    appsLabel: 'Apps',
    apps: [
      { href: 'mixtura/', name: 'Drink Builder', what: 'A workbench for mixed drinks' },
      { href: 'culina/', name: 'Cook’s Workbench', what: 'A helper in the kitchen' },
      { href: 'emptio/', name: 'Shopping List', what: 'The household’s shopping list' },
    ],
    syncTitle: 'Sync',
    syncIntro:
      'Keep the apps in step on your devices, or share them with other people, through a storage you choose.',
    empty:
      'A space is a group of people and what they share, for example a household: every device that knows the space’s secret keeps the same data in step. The data goes through a storage you choose, encrypted, and nothing leaves this device until you create or join a space.',
    spacesLabel: 'Spaces on this device',
    create: 'Create a space',
    join: 'Join with a link',
    joinTitle: 'Join with a link',
    joinLabel: 'Invite link',
    joinHint: 'Paste the link that someone sent you, or its end starting with #/join/.',
    joinButton: 'Continue',
  },
  storage: {
    deviceOnly: 'On this device only',
  },
  status: {
    never: 'Never synced',
    inStep: (ago: string) => `In step · ${ago}`,
    failed: 'Last sync failed',
    syncing: 'Syncing…',
  },
  create: {
    title: 'Create a space',
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    name: {
      heading: 'Name the space',
      explain: 'What you and the others will call it. You can change it later.',
      label: 'Name',
      suggestion: 'Home',
      invalid: 'Enter a name of 1 to 60 characters.',
    },
    type: {
      heading: 'Where are the files kept?',
      explain:
        'The files are encrypted on this device before they leave it. The storage only holds them.',
      github: {
        title: 'GitHub',
        what: 'A private repository of yours. Needs a GitHub account and a token for that one repository.',
      },
      webdav: {
        title: 'WebDAV',
        what: 'A folder on a WebDAV server, for example Nextcloud. Needs the server’s address and an account there; the server has to allow requests from this page (CORS).',
      },
    },
    github: {
      heading: 'Connect GitHub',
      explain: 'Three steps, one after the other.',
      step1: 'A private repository',
      step1Text:
        'Open GitHub’s form with the name already filled in and create the repository as private. An existing private repository works too; then you can skip this step.',
      step1Button: 'Open “new repository” on GitHub',
      step2: 'A token for that repository only',
      step2Text:
        'Open GitHub’s form: name, a year’s validity and the permission are filled in. Then:',
      step2Button: 'Open “new token” on GitHub',
      step2List: [
        'Under “Repository access” choose “Only select repositories” and pick the repository.',
        'Check that “Contents” says “Read and write”; change the name or validity if you like.',
        'Click “Generate token” and copy the token.',
      ],
      tokenName: 'Household',
      step3: 'Paste the token here',
      tokenHint:
        'It stays on this device. It is sent only to GitHub, and it is never put into an address.',
      checking: 'Looking at GitHub…',
      none: 'The token reaches no repository. Make the token again and, under “Only select repositories”, pick the repository.',
      noneWritable:
        'The token reaches repositories but may not write to any of them. Make the token again with “Contents” set to “Read and write”.',
      pickHeading: 'Which repository?',
      pickExplain: 'The token reaches several repositories. Choose the one for the household.',
      private: 'private',
      public: 'public',
      publicTitle: 'This repository is public',
      publicText: (repository: string) =>
        `The files in ${repository} are encrypted, but anyone can see that they exist and how often they change. A private repository is better.`,
      publicUse: 'Use it anyway',
      publicOther: 'Use another repository',
      readonlyTitle: 'The token cannot write',
      readonlyText: (repository: string) =>
        `The token can read ${repository} but not write to it. Make the token again with “Contents” set to “Read and write”, then paste it here.`,
    },
    webdav: {
      heading: 'Connect a WebDAV folder',
      explain: 'The address, user name and password stay on this device.',
      address: 'Address',
      addressHint:
        'The WebDAV address of a folder that exists, starting with https://. On Nextcloud it ends in /remote.php/dav/files/ and your user name.',
      test: 'Test connection',
      testing: 'Testing…',
      connected: 'Connected. The storage answered and this page can read the answer.',
      badAddress:
        'The address has to start with https:// and must not contain a user name or password.',
    },
    finish: {
      heading: 'Create the space',
      explain:
        'This makes the space’s secret on this device, writes its first file to the storage and reads it back.',
      nameLine: 'Name',
      storageLine: 'Storage',
      button: 'Create space',
      creating: 'Creating the space and writing its first file…',
      failedTitle: 'The space was not created',
      failedHint: 'Nothing was kept on this device. Fix the cause and try again.',
    },
  },
  space: {
    notFound: 'This space is not on this device.',
    home: 'Back to Household',
    nameLabel: 'Name',
    rename: 'Rename',
    nameSaved: 'The name is saved.',
    invalidName: 'Enter a name of 1 to 60 characters.',
    storageTitle: 'Storage',
    lastTitle: 'Last sync',
    syncNow: 'Sync now',
    syncing: 'Syncing…',
    invite: 'Invite someone',
    changeAccess: 'Change storage access',
    remove: 'Remove from this device',
    removeTitle: 'Remove this space from this device?',
    removeText:
      'The space, its secret and the storage access are deleted from this device only. The files in the storage stay, and other devices are not affected. If this is the only device that knows the secret, nobody can open the files again.',
    removeConfirm: 'Remove',
    removeDeviceOnlyText:
      'This space is on this device only, and no copy exists anywhere else. The space, its secret and everything the apps keep in it, for example the stock, are deleted for good and cannot be brought back.',
    deviceOnlyText:
      'This space and what the apps keep in it, for example the stock, are on this device only. Nothing is sent anywhere.',
    connect: 'Connect a storage',
    connected: (storage: string) =>
      `The space is now kept in step through ${storage}. Open the apps once so they send what they keep.`,
    removed: 'The space was removed from this device.',
    created: 'The space is created. Its first file was written to the storage and read back.',
    joined: (name: string) => `You joined “${name}”.`,
    joinedEmpty:
      'The storage holds no data for this space yet; the device that made the invite may not have synced yet. Sync now looks again.',
    accessSaved: 'The access is saved.',
  },
  person: {
    title: 'Who uses this device',
    current: (name: string) =>
      `This device is ${name}. The apps keep what is personal, like ratings, under this name.`,
    none: 'Choose who you are, or add yourself. The apps keep what is personal, like ratings, under this name.',
    newLabel: 'New person',
    add: 'Add me',
  },
  connect: {
    title: 'Connect a storage',
    intro: (name: string) =>
      `“${name}” is on this device only. With a storage it is kept in step on your devices and can be shared; the space, its secret and its data stay as they are.`,
    heading: 'Connect the storage',
    explain:
      'This writes the space’s first file to the storage and reads it back. What the apps keep in the space follows when you open them.',
    spaceLine: 'Space',
    storageLine: 'Storage',
    button: 'Connect storage',
    connecting: 'Connecting the storage and writing the first file…',
    failedTitle: 'The storage was not connected',
    failedHint:
      'The space stays on this device only and nothing of it was removed. Fix the cause and try again.',
  },
  access: {
    title: 'Change storage access',
    githubIntro:
      'Make a new token for the same repository and paste it here. It needs “Contents” set to “Read and write”.',
    webdavIntro: 'Enter the user name and password of the storage again.',
    save: 'Save access',
    saving: 'Checking and saving…',
  },
  invite: {
    title: 'Invite someone',
    intro:
      'Show the QR code or send the link. The other person opens it in this app and joins the space.',
    include: 'Include the storage access',
    includeGithub:
      'The other person can then read and write everything in that one repository, in the name of whoever made the token, and needs no GitHub account. Anyone who gets the link gets the same.',
    includeWebdav:
      'The other person can then read and write everything the user name may on that server. Anyone who gets the link gets the same.',
    without:
      'Without it, the other person enters their own access to the storage when they join, for GitHub a token of their own for the repository.',
    alwaysTitle: 'What the invite always contains',
    always:
      'The space’s secret. Whoever has it can read and change everything in the space. Treat the link like a key: it cannot be taken back, only replaced by a new space.',
    linkLabel: 'Invite link',
    copy: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Copying did not work. Select the link and copy it by hand.',
    share: 'Share…',
    qrLabel: 'QR code of the invite link',
    qrTooLong: 'The link is too long for a QR code. Send the link instead.',
    qrNote: 'Drawn on this device; the link is not sent anywhere.',
    backToSpace: 'Back to the space',
  },
  join: {
    title: 'Join a space',
    problemTitle: 'This invite cannot be used',
    spaceLine: 'Space',
    unnamed: 'A space',
    storageLine: 'Storage',
    accessIncluded: 'The invite includes access to the storage.',
    accessNeeded:
      'The invite does not include access to the storage. Enter your own below, then join.',
    githubSteps: 'You need a token for this repository, made like this:',
    githubStepsList: [
      'Open GitHub’s “new token” form; name, validity and “Contents: Read and write” are filled in.',
      'Under “Repository access” choose “Only select repositories” and pick this repository.',
      'Generate the token, copy it and paste it below.',
    ],
    openTokenPage: 'Open “new token” on GitHub',
    button: 'Join',
    joining: 'Joining…',
    alreadyHere: (name: string | undefined) =>
      name === undefined
        ? 'This space is already on this device.'
        : `“${name}” is already on this device.`,
    open: 'Open it',
    readonly: (repository: string) =>
      `The token can read ${repository} but not write to it. Make a token with “Contents” set to “Read and write”.`,
    errors: {
      empty: 'Paste the invite link first.',
      'not-a-link':
        'This is not an invite link. It should end in #/join/ followed by a long text. Copy the whole link again.',
      'not-json': 'The invite is damaged or cut off. Ask for a new one.',
      invalid: 'The invite is damaged or cut off. Ask for a new one.',
      'not-an-invite': 'The invite is damaged or cut off. Ask for a new one.',
      'older-version':
        'This invite was made by an older version that is no longer read. Ask for a new one.',
      'newer-version':
        'This invite was made by a newer version. Reload this page to update, then open the link again.',
      'unknown-storage': 'This invite is for a kind of storage this app does not know.',
      'bad-address': 'The storage address in this invite is not valid. Ask for a new invite.',
    } satisfies Record<JoinError, string>,
  },
  fields: {
    tokenLabel: 'Token',
    user: 'User name',
    password: 'Password',
    webdavOptional: 'Leave both empty if the server needs no sign-in.',
    showTokenAria: 'Show the token',
    hideTokenAria: 'Hide the token',
    showPasswordAria: 'Show the password',
    hidePasswordAria: 'Hide the password',
    emptyToken: 'Paste the token first.',
  },
  failures: {
    generic: {
      conflict:
        'Another device wrote at the same time and this one gave up after a few tries. Nothing was lost; Sync now tries again.',
      unauthorised: 'The storage refused the sign-in. Check the access you gave it and try again.',
      'not-found':
        'The storage could not find what it needs. Check its address and that the folder exists.',
      unreachable:
        'There is no connection. This device seems to be offline; try again when it is online.',
      blocked:
        'The storage answered in a way this page may not read, usually because it does not allow requests from this page (CORS), or the address is wrong.',
      server: 'The storage answered with an error. Try again in a little while.',
      'not-sealed':
        'The file in the storage is not one of these apps’ files. Nothing was overwritten. Check that the folder is not used for something else.',
      'newer-version':
        'The files come from a newer version of the apps. Reload this page to update it and try again.',
      'wrong-key':
        'The files in the storage cannot be opened with this space’s secret: they belong to another space, or they were changed. Nothing was overwritten.',
      'bad-document':
        'The file in the storage opened, but its content is damaged. Nothing was overwritten.',
      'other-space': 'The file in the storage belongs to another space. Nothing was overwritten.',
      'other-collection':
        'The file in the storage belongs to something else than expected. Nothing was overwritten.',
      'bad-now':
        'This device’s clock is not set to a valid time. Correct the date and time of the device and try again.',
      'bad-storage':
        'The storage settings of this space cannot be used (an address or the access is missing or wrong). Remove the space from this device and join it again with an invite.',
      'bad-secret':
        'The secret of this space is damaged on this device. Remove the space from this device and join it again with an invite.',
      'store-unavailable':
        'This browser does not let the page keep data (a private window, or blocked site data?). Spaces cannot be saved here.',
      'store-blocked':
        'Another open tab of this address holds the data back. Close the other tabs and reload this page.',
      unexpected: 'Something unexpected went wrong. Reload the page and try again.',
    },
    github: {
      unauthorised:
        'GitHub refused the token. Check that you copied all of it and that it has not expired or been revoked. A new token with “Contents” set to “Read and write” for this repository fixes it.',
      'not-found':
        'GitHub does not know this repository, or the token does not reach it. Check that the token was made for exactly this repository.',
      blocked:
        'The browser did not let this page reach GitHub. A content blocker or a network filter may be in the way; try without it.',
    },
    webdav: {
      unauthorised: 'The storage refused the user name or password. Check both and try again.',
      'not-found': 'The folder could not be found or made. Check the address.',
      blocked:
        'The storage answered in a way this page may not read, usually because it does not allow requests from this page (CORS). Check the address too.',
    },
    httpStatus: (status: string) => ` (answer ${status})`,
    rateLimitedUntil: (time: string) =>
      `GitHub says there were too many requests. Sync again after ${time}.`,
    rateLimited: 'GitHub says there were too many requests. Wait a few minutes and try again.',
  } as FailureTexts,
};

export type Strings = typeof stringsEn;
