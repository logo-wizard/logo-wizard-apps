import React from "react";
import TriangleLoader from "../Loader/Loader";


const LoadingPage = () => {
    // A simple page with a single loader

    return (
        <div style={{
            width: '120px',
            margin: '20% auto',
        }}>
            <TriangleLoader width={100} height={100}/>
        </div>
    )
}

export default LoadingPage;
