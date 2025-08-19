import React from 'react';
import AvatarFrame from './AvatarFrame';
import { getAllFrames } from '@/data/frames';

export const AvatarWithFrame: React.FC<React.ComponentProps<typeof AvatarFrame>> = (props) => {
	return <AvatarFrame {...props} />;
};

export const availableFrames = getAllFrames();

export default AvatarWithFrame;

