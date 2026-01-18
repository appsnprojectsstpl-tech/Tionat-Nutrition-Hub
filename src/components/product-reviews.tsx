'use client';

import { useState } from 'react';
import { useAuth, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, increment } from 'firebase/firestore';
import type { Review } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, StarHalf, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

interface ProductReviewsProps {
    productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
    const firestore = useFirestore();
    const { user, isUserLoading } = useAuth();
    const { toast } = useToast();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaList, setMediaList] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reviewsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, `products/${productId}/reviews`), orderBy('date', 'desc')) : null),
        [firestore, productId]
    );
    const { data: reviews, isLoading } = useCollection<Review>(reviewsQuery);

    const handleAddMedia = () => {
        if (!mediaUrl.trim()) return;
        setMediaList([...mediaList, mediaUrl.trim()]);
        setMediaUrl('');
    };

    const handleRemoveMedia = (index: number) => {
        setMediaList(mediaList.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) return;

        if (!comment.trim()) {
            toast({ title: "Error", description: "Please write a comment.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const newReview: Omit<Review, 'id'> = {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                rating,
                comment,
                date: Timestamp.now(),
                productId,
                media: mediaList
            };

            await addDocumentNonBlocking(collection(firestore, `products/${productId}/reviews`), newReview);

            await setDocumentNonBlocking(doc(firestore, 'products', productId), {
                reviewCount: increment(1)
            }, { merge: true });

            toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
            setComment('');
            setRating(5);
            setMediaList([]);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-4 w-4 ${star <= rating ? 'fill-current' : 'text-gray-300'}`} />
                ))}
            </div>
        );
    };

    const renderInputStars = () => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl focus:outline-none transition-colors ${star <= rating ? 'text-yellow-500' : 'text-gray-300'
                            }`}
                    >
                        ★
                    </button>
                ))}
            </div>
        );
    };

    const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
        : 0;

    return (
        <div className="mt-12 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-4">
                        Customer Reviews
                        {reviews && reviews.length > 0 && (
                            <div className="flex items-center gap-2 text-base font-normal">
                                {renderStars(Math.round(averageRating))}
                                <span className="text-muted-foreground">({reviews.length} reviews)</span>
                            </div>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Write Review Section */}
                    <div className="mb-8 p-6 bg-secondary/20 rounded-xl">
                        {!user ? (
                            <div className="text-center py-4">
                                <p className="text-muted-foreground mb-4">Please login to write a review.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <h3 className="font-semibold text-lg">Write a Review</h3>
                                <div>
                                    <span className="block text-sm font-medium mb-1">Your Rating</span>
                                    {renderInputStars()}
                                </div>
                                <Textarea
                                    placeholder="Share your thoughts about this product..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    required
                                    className="bg-background"
                                />

                                {/* Media Input */}
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Paste image URL here..."
                                            value={mediaUrl}
                                            onChange={(e) => setMediaUrl(e.target.value)}
                                            className="bg-background"
                                        />
                                        <Button type="button" variant="secondary" onClick={handleAddMedia}>
                                            <ImageIcon className="h-4 w-4 mr-2" />
                                            Add Photo
                                        </Button>
                                    </div>
                                    {/* Media Preview Wrappers */}
                                    {mediaList.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {mediaList.map((url, idx) => (
                                                <div key={idx} className="relative group">
                                                    <img src={url} alt="preview" className="h-20 w-20 object-cover rounded-md border" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMedia(idx)}
                                                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                </Button>
                            </form>
                        )}
                    </div>

                    <Separator className="my-6" />

                    {/* Reviews List */}
                    <div className="space-y-6">
                        {isLoading ? (
                            <p>Loading reviews...</p>
                        ) : reviews?.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No reviews yet. Be the first to review!</p>
                        ) : (
                            reviews?.map((review) => (
                                <div key={review.id} className="flex flex-col sm:flex-row gap-4 border-b pb-6 last:border-0 last:pb-0">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>{review.userName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-2 flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm">{review.userName}</h4>
                                            <span className="text-xs text-muted-foreground">
                                                {review.date ? format((review.date as Timestamp).toDate(), 'MMM d, yyyy') : ''}
                                            </span>
                                        </div>
                                        {renderStars(review.rating)}
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{review.comment}</p>

                                        {/* Review Media */}
                                        {review.media && review.media.length > 0 && (
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {review.media.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={url}
                                                            alt={`Review attachment ${i + 1}`}
                                                            className="h-24 w-24 object-cover rounded-md border hover:opacity-90 transition-opacity"
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
