import {BrowserRouter, Route, Routes} from "react-router-dom";

import GeneratePage from "./components/Pages/Generate/GeneratePage";
import LogoViewerPage from "./components/Pages/LogoViewer/LogoViewerPage";
import PrivateRoute from "./helpers/PrivateRoute";
import ProfilePage from "./components/Pages/Profile/ProfilePage";
import LoadingPage from "./components/LoadingPage/LoadingPage";
import NotFoundPage from "./components/Pages/NotFoundPage/NotFoundPage";
import LogoEditorPage from "./components/Pages/LogoEditor/LogoEditorPage";


const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='*' element={<NotFoundPage/>}/>

                <Route path='/' element={<GeneratePage/>}/>
                <Route path='/loading' element={<LoadingPage/>}/>
                <Route path='/view-logo/:logo_id' element={<LogoViewerPage/>}/>

                <Route path='/edit-logo/:logo_id' element={
                    <PrivateRoute>
                        <LogoEditorPage/>
                    </PrivateRoute>
                }/>

                <Route path='/profile' element={
                    <PrivateRoute>
                        <ProfilePage other={false}/>
                    </PrivateRoute>
                }/>
                <Route path={'/user/:user_id'} element={<ProfilePage other={true}/>}/>
            </Routes>
        </BrowserRouter>
    );
};


export default App;
