/**
 * Trello API Types and Interfaces
 */

export interface TrelloTokens {
  token: string;
  tokenSecret?: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
  closed: boolean;
  prefs: BoardPrefs;
  idOrganization?: string;
  pinned?: boolean;
  starred?: boolean;
}

export interface BoardPrefs {
  permissionLevel: string;
  voting: string;
  comments: string;
  invitations: string;
  selfJoin: boolean;
  cardCovers: boolean;
  background: string;
  backgroundColor: string;
  backgroundImage?: string;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
  subscribed?: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  dueComplete?: boolean;
  idList: string;
  idBoard: string;
  url: string;
  shortUrl?: string;
  labels: TrelloLabel[];
  idMembers: string[];
  idChecklists?: string[];
  closed: boolean;
  pos: number;
  dateLastActivity?: string;
  badges?: CardBadges;
}

export interface CardBadges {
  votes: number;
  attachments: number;
  comments: number;
  checkItems: number;
  checkItemsChecked: number;
  description: boolean;
  due: string | null;
  dueComplete: boolean;
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string;
}

export interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
  initials: string;
  avatarUrl?: string;
  email?: string;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idBoard: string;
  idCard: string;
  pos: number;
  checkItems: CheckItem[];
}

export interface CheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  pos: number;
  idChecklist: string;
}

export interface TrelloComment {
  id: string;
  idMemberCreator: string;
  data: {
    text: string;
    card: {
      id: string;
      name: string;
    };
    board: {
      id: string;
      name: string;
    };
  };
  type: string;
  date: string;
  memberCreator: TrelloMember;
}

export interface TrelloWebhook {
  id: string;
  description: string;
  idModel: string;
  callbackURL: string;
  active: boolean;
}

export interface CreateCardOptions {
  name: string;
  desc?: string;
  idList: string;
  due?: string;
  pos?: 'top' | 'bottom' | number;
  idLabels?: string[];
  idMembers?: string[];
  urlSource?: string;
}

export interface UpdateCardOptions {
  name?: string;
  desc?: string;
  idList?: string;
  due?: string;
  dueComplete?: boolean;
  closed?: boolean;
  pos?: 'top' | 'bottom' | number;
  idMembers?: string[];
  idLabels?: string[];
}

export interface CreateListOptions {
  name: string;
  idBoard: string;
  pos?: 'top' | 'bottom' | number;
}

export interface CreateBoardOptions {
  name: string;
  desc?: string;
  idOrganization?: string;
  prefs_permissionLevel?: 'private' | 'org' | 'public';
  prefs_background?: string;
}

export interface SearchOptions {
  query: string;
  modelTypes?: string[];
  idBoards?: string[];
  partial?: boolean;
}

// Database models
export interface TrelloTokenRecord {
  id: string;
  user_id: string;
  token: string;
  username: string;
  full_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface TrelloBoardMapping {
  id: string;
  user_id: string;
  board_id: string;
  board_name: string;
  list_id?: string;
  list_name?: string;
  label_id?: string;
  label_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TrelloCardSync {
  id: string;
  email_id: string;
  card_id: string;
  board_id: string;
  list_id: string;
  synced_at: Date;
}
