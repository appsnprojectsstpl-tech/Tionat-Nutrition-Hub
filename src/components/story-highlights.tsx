import Image from "next/image";
import Link from "next/link";

const stories = [
    {
        id: 'new',
        title: 'New In',
        image: 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?q=80&w=200&auto=format&fit=crop', // Burger/Food placeholder
        link: '/search?sort=desc'
    },
    {
        id: 'deals',
        title: 'Deals',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=200&auto=format&fit=crop', // Shopping bags
        link: '/search?maxPrice=500'
    },
    {
        id: 'protein',
        title: 'Protein',
        image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?q=80&w=200&auto=format&fit=crop', // Whey
        link: '/search?category=protein'
    },
    {
        id: 'snacks',
        title: 'Snacks',
        image: 'https://images.unsplash.com/photo-1621939514649-28b12e81658b?q=80&w=200&auto=format&fit=crop', // Snacks
        link: '/search?category=snacks'
    },
    {
        id: 'vegan',
        title: 'Vegan',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200&auto=format&fit=crop', // Salad
        link: '/search?q=vegan'
    },
];

export function StoryHighlights() {
    return (
        <div className="w-full overflow-x-auto pb-4 pt-2 no-scrollbar">
            <div className="flex gap-4 px-4 min-w-max">
                {stories.map((story) => (
                    <Link key={story.id} href={story.link} className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 group-hover:from-yellow-500 group-hover:to-fuchsia-700 transition animate-in fade-in zoom-in duration-500">
                            <div className="bg-background rounded-full p-[2px]">
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden">
                                    <Image
                                        src={story.image}
                                        alt={story.title}
                                        fill
                                        className="object-cover group-hover:scale-110 transition duration-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-center">{story.title}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
