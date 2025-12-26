export interface ProjectSpec {
    id: string;
    user_id: string;
    client_id: string;
    project_name: string;
    current_version: number;
    status: 'draft' | 'locked' | 'archived';
    trello_card_id?: string;
    trello_board_id?: string;
    created_at: Date;
    updated_at: Date;
    locked_at?: Date;
}

export interface SpecVersion {
    id: string;
    spec_id: string;
    version_number: number;
    content: SpecContent;
    change_summary?: string;
    change_reason?: string;
    created_by: 'user' | 'system';
    created_at: Date;
}

export interface SpecContent {
    project_name: string;
    client_name?: string;
    deliverables: SpecItem[];
    specifications: SpecItem[];
    client_provides: SpecItem[];
    timeline: {
        start_date?: string;
        delivery_date?: string;
        milestones?: { date: string; description: string }[];
    };
    budget: {
        total?: string;
        terms?: string;
    };
    revision_rounds?: string;
    exclusions: SpecItem[];
    notes?: string[];
    source?: {
        email_id?: string;
        attachments?: string[];
    };
}

export interface SpecItem {
    id: string;
    description: string;
    status?: 'pending' | 'complete';
}

export interface CreateSpecDTO {
    user_id: string;
    client_id: string;
    project_name: string;
    initial_content: SpecContent;
    source_email_id?: string;
}

export interface UpdateSpecDTO {
    content: SpecContent;
    change_summary?: string;
    change_reason?: string;
}
