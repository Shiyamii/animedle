import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export interface AdminAnimeDTO {
    id: string;
    title: string;
    imageUrl: string;
    titles: { type: string; title: string }[];
    anime_format: string;
    genres: string[];
    demographic_type: string;
    episodes: number;
    season_start: string;
    studio: string;
    source: string;
    score: number;
}

export interface AdminStatsTodayDTO {
    anime: AdminAnimeDTO | null;
    date: string | null;
    totalGuesses: number;
    totalWins: number;
    winDistribution: Record<string, number>;
}

export interface AdminStatsGlobalDTO {
    totalDays: number;
    totalGuesses: number;
    totalWins: number;
    winDistribution: Record<string, number>;
}

export interface AdminStatsDTO {
    today: AdminStatsTodayDTO;
    global: AdminStatsGlobalDTO;
}

export interface AnimeFormData {
    imageUrl: string;
    titles: { type: string; title: string }[];
    anime_format: string;
    genres: string;
    demographic_type: string;
    episodes: string;
    season_start: string;
    studio: string;
    source: string;
    score: string;
}

const defaultForm: AnimeFormData = {
    imageUrl: '',
    titles: [{ type: 'Default', title: '' }],
    anime_format: '',
    genres: '',
    demographic_type: '',
    episodes: '',
    season_start: '',
    studio: '',
    source: '',
    score: '',
};

export function useAdminViewModel() {
    const [animes, setAnimes] = useState<AdminAnimeDTO[]>([]);
    const [currentAnime, setCurrentAnime] = useState<AdminAnimeDTO | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'animes' | 'daily' | 'stats'>('animes');
    const [stats, setStats] = useState<AdminStatsDTO | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const statsFetched = useRef(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<AnimeFormData>(defaultForm);
    const [error, setError] = useState<string | null>(null);
    const [selectedAnimeId, setSelectedAnimeId] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadAnimes = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/animes`, { credentials: 'include' });
            const data = await res.json();
            setAnimes(data);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadCurrentAnime = useCallback(async () => {
        const res = await fetch(`${API_URL}/api/admin/animes/current`, { credentials: 'include' });
        const data = await res.json();
        setCurrentAnime(data);
    }, []);

    const loadStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' });
            const data = await res.json();
            setStats(data);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        loadAnimes();
        loadCurrentAnime();
    }, [loadAnimes, loadCurrentAnime]);

    useEffect(() => {
        if (activeTab === 'stats' && !statsFetched.current) {
            statsFetched.current = true;
            loadStats();
        }
    }, [activeTab, loadStats]);

    const openCreateForm = () => {
        setEditingId(null);
        setForm(defaultForm);
        setError(null);
        setShowForm(true);
    };

    const openEditForm = (anime: AdminAnimeDTO) => {
        setEditingId(anime.id);
        setForm({
            imageUrl: anime.imageUrl,
            titles: anime.titles.map(t => ({ ...t })),
            anime_format: anime.anime_format ?? '',
            genres: anime.genres.join(', '),
            demographic_type: anime.demographic_type ?? '',
            episodes: anime.episodes?.toString() ?? '',
            season_start: anime.season_start ?? '',
            studio: anime.studio ?? '',
            source: anime.source ?? '',
            score: anime.score?.toString() ?? '',
        });
        setError(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(defaultForm);
        setError(null);
    };

    const updateFormField = (key: keyof Omit<AnimeFormData, 'titles'>, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const updateTitle = (idx: number, field: 'type' | 'title', value: string) => {
        setForm(prev => {
            const titles = [...prev.titles];
            titles[idx] = { ...titles[idx], [field]: value };
            return { ...prev, titles };
        });
    };

    const addTitle = () => {
        setForm(prev => ({ ...prev, titles: [...prev.titles, { type: '', title: '' }] }));
    };

    const removeTitle = (idx: number) => {
        setForm(prev => ({ ...prev, titles: prev.titles.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const payload = {
                imageUrl: form.imageUrl,
                titles: form.titles,
                anime_format: form.anime_format,
                genres: form.genres.split(',').map(g => g.trim()).filter(Boolean),
                demographic_type: form.demographic_type,
                episodes: parseInt(form.episodes) || 0,
                season_start: form.season_start,
                studio: form.studio,
                source: form.source,
                score: parseFloat(form.score) || 0,
            };

            const url = editingId
                ? `${API_URL}/api/admin/animes/${editingId}`
                : `${API_URL}/api/admin/animes`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? 'Erreur lors de la sauvegarde');
                return;
            }

            closeForm();
            await loadAnimes();
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = (id: string) => setDeleteConfirmId(id);
    const cancelDelete = () => setDeleteConfirmId(null);

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        setIsLoading(true);
        try {
            await fetch(`${API_URL}/api/admin/animes/${deleteConfirmId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            setDeleteConfirmId(null);
            await loadAnimes();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetRandom = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/animes/current/random`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            setCurrentAnime(data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetSpecific = async () => {
        if (!selectedAnimeId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/animes/current/${selectedAnimeId}`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            setCurrentAnime(data);
            setSelectedAnimeId('');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        animes,
        currentAnime,
        isLoading,
        activeTab,
        setActiveTab,
        showForm,
        editingId,
        form,
        error,
        selectedAnimeId,
        setSelectedAnimeId,
        deleteConfirmId,
        openCreateForm,
        openEditForm,
        closeForm,
        updateFormField,
        updateTitle,
        addTitle,
        removeTitle,
        handleSubmit,
        confirmDelete,
        cancelDelete,
        handleDelete,
        handleSetRandom,
        handleSetSpecific,
        stats,
        isLoadingStats,
        loadStats,
    };
}
