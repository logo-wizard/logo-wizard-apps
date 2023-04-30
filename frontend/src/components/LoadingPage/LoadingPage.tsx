import React from "react";
import {Triangle} from "react-loader-spinner";


const LoadingPage = () => {
    return (
        <div style={{
            width: '120px',
            margin: '20% auto',
        }}>
            <Triangle
                height="100"
                width="100"
                color="#007bff"
                ariaLabel="triangle-loading"
                wrapperStyle={{}}
                // wrapperClassName=""
                visible={true}
            />
        </div>
    )
}

export default LoadingPage;
