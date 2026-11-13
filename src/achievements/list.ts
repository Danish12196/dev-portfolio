// Every achievement. Kept free of browser code so the leaderboard server can import it too.

export interface Achievement {
  id: string
  title: string
  /** Shown in the notepad before it's found. */
  hint: string
  /** Shown once found. */
  done: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'sudo', title: 'Not in the sudoers file', hint: 'Ask the terminal for superpowers.', done: 'You tried sudo.' },
  { id: 'rm', title: 'Deleted everything', hint: 'Try deleting everything. What could go wrong?', done: 'rm -rf / and a blue screen.' },
  { id: 'hack', title: 'Mainframe breached', hint: 'Every movie hacker types the same word.', done: 'You hacked the mainframe.' },
  { id: 'vim', title: 'Escaped vim', hint: 'Open a certain editor, then try to leave.', done: 'Put it on your CV.' },
  { id: 'coffee', title: 'Teapot', hint: 'The developer runs on a hot drink.', done: "Error 418: I'm a teapot." },
  { id: 'xyzzy', title: 'Nothing happens', hint: 'A magic word from a very old adventure game.', done: 'xyzzy' },
  { id: 'answer', title: 'Deep thought', hint: 'Life, the universe and everything.', done: '42.' },
  { id: 'dotfile', title: 'Dotfiles', hint: 'Some files hide from a plain ls.', done: 'ls -a found the secret file.' },
  { id: 'escape', title: 'Above home', hint: 'Try to climb above your home folder.', done: 'There is nothing above ~.' },
  { id: 'konami', title: '+30 lives', hint: '↑ ↑ ↓ ↓ ← → ← → …', done: 'Rainbow skin unlocked.' },
  { id: 'restart', title: 'Off and on again', hint: 'Have you tried turning it off and on again?', done: 'Restarted PaperOS.' },
  { id: 'shutdown', title: 'No off switch', hint: 'Try to switch the whole thing off.', done: 'Websites cannot shut down.' },
  { id: 'reader', title: 'Bookworm', hint: 'Read three READMEs.', done: 'Three READMEs read.' },
  { id: 'wordpress', title: 'Wrong CMS', hint: 'Every bot on the internet tries to log in to the same blog admin page.', done: 'This is not WordPress.' },
  { id: 'console', title: 'Root access', hint: 'Open the browser console. Someone left a login there.', done: 'Logged in from the console.' },
  { id: 'header', title: 'Read the headers', hint: 'The server sends a little extra with every page.', done: 'Found the x-achievement header.' },
  { id: 'dns', title: 'Dug deep', hint: 'Domains can keep text records too. Dig around.', done: 'Found the DNS TXT record.' },
  { id: 'star-sky', title: 'Wishing star', hint: 'A star is hiding somewhere on the desktop.', done: 'Caught the star on the desktop.' },
  { id: 'star-menu', title: 'Pocket star', hint: 'A star is tucked inside a menu (on a phone, the dock).', done: 'Found the pocket star.' },
  { id: 'star-term', title: 'Terminal star', hint: 'A star is printed in some system info.', done: 'Found the star in neofetch.' },
]
