import React, { useState } from 'react';
import axios from 'axios';
import API_URL from "../config";
import { CommentFormProps } from '../common/Types';

const CommentForm: React.FC<CommentFormProps> = ({ productCd, addComment }) => {

    const [content, setContent] = useState('');    

    const handleSubmit = (event: any) => {
        event.preventDefault();

        axios.post(`${API_URL}/comment`, { 
          content: content, 
          productCd: productCd, 
        })
        .then(response => {
            addComment(response.data);
            setContent('');                
        })
        .catch(error => {
            console.error('There was an error adding the comment!', error);
        });
    };

    return (
        <form onSubmit={handleSubmit} className="d-flex mt-3">            
            <div className="flex-grow-1 me-2">                
                <textarea
                    className="form-control"
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder='댓글을 입력하세요'
                />
            </div>
            <button type="submit" 
              className="btn btn-primary align-self-start"
              style={{ height: 'calc(3 * 1.5em + 2px)' }}
            >
              등록하기
            </button>
        </form>
    );
};

export default CommentForm;
