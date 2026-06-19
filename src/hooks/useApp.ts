import { useContext } from 'react';
import { AppContext, AppContextType } from '../context';

export const useApp = (): AppContextType => {
	return useContext(AppContext);
};
