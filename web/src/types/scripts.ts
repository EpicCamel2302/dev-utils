export type Script = {
    name: string;
    description: string;
    fileName: string;
    category: string;
    context: string;
    params: Array<{
        name: string;
        type: 'string' | 'number' | 'boolean' | 'select'
    }>;
    required?: boolean;
    default?: any;
    options?: string[];
};
