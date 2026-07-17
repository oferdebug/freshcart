'use client';

import Link from 'next/link';
import {useMutation, useQuery} from "convex/react";
import {api} from "@/convex/_generated/api";
import {Heart} from "lucide-react";

export default function FavoritesPage() {
    const user=useQuery(api.users.current);
    const favorites=useQuery(
        api.favorites.list,
        user ? {userId:user._id}:'skip',
    );
    const addItem=useMutation(api.cart.addItem);
    const toggleFavorites=useMutation(api.favorites.toggle);
    if(user===undefined || favorites===undefined) {
        return (
            <main className={'flex-1 p-6'}>
                <p className={'text-muted-foreground'}>Loading Your Favorites...</p>
            </main>
        );
    }
    if(user===null || favorites===null)  {
        return (
            <main className={'flex-1 p-6'}>
                <h1 className={'text-2xl font-bold'}>Favorites</h1>
                <p className={'mt-2 text-muted-foreground'}>Sign In To View Your Favorites</p>
            </main>
        );
    }
    if(favorites.legnth===0) {
        return (
            <main className={'flex flex-1 flex-col items-center justify-center gap-4 gap-6'}>
                <Heart className={'h-14 w-14 text-muted-foreground'} />
            </main>
        )
    }
    return (
        <div>FavoritesPage</div>
    )
}
