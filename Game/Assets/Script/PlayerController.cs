using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [Header("Horizontal Setting")]
    [SerializeField] private float speed = 5f;

    [Header("Vertical Setting")]
    [SerializeField] private float jumpForce = 8f;
    [Space(5)]

    [Header("Ground Check Setting")]
    [SerializeField] private Transform groundCheck;
    [SerializeField] private float groundCheckY = 0.2f;
    [SerializeField] private float groundCheckX = 0.5f;
    [SerializeField] private LayerMask collisionMask;
    [Space(5)]

    [Header("Wall Jump")]
    [SerializeField] private float wallSlidingSpeed = 2f;
    [SerializeField] private LayerMask wallLayer;
    [SerializeField] private Transform wallCheck;
    [SerializeField] private float wallJumpingDuration;
    [SerializeField] private Vector2 wallJumpingPower;
    float wallJumpingDirection;
    bool isWallSliding;
    bool isWallJumping;
    [Space(5)]

    [Header("Attack Setting")]
    bool attack = false;
    [SerializeField] float timeBetweenAttack;
    private float timeSinceAttack;
    [SerializeField] Transform SideAttackTransform;
    [SerializeField] Vector2 SideAttackArea, UpAttackArea, DownAttackArea;
    [SerializeField] LayerMask attackableLayer;
    [SerializeField] float damage;
    [SerializeField] GameObject slashEffect;
    [Space(5)]

    [Header("Recoil Setting")]
    [SerializeField] int recoilXStep = 5;
    [SerializeField] int recoilYStep = 5;
    [SerializeField] float recoilXSpeed = 100;
    [SerializeField] float recoilYSpeed = 100;
    int stepXRecoilded, stepYRecoilded;
    [Space(5)]

    

    public static PlayerController Instance;
    private Rigidbody2D rb;
    public float xAxis, yAxis;

    private void Awake()
    {
        if(Instance != null && Instance != this)
        {
            Destroy(gameObject);
        }
        else
        {
            Instance = this;
        }
    }
    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
    }

    
    void FixedUpdate()
    {
        GetInput();
        CheckForWall();
        Movement();
        Jump();
    }

    private void Movement()
    {
        if (isWallJumping)
        {
            
            return;
        }

        var horizontalInput = Input.GetAxis("Horizontal");
        
        if (isWallSliding)
        {
           
            rb.velocity = new Vector2(rb.velocity.x, -wallSlidingSpeed);
        }
        else
        {
            rb.velocity = new Vector2(horizontalInput * speed, rb.velocity.y);
        }
    }
    
    private void GetInput()
    {
        xAxis = Input.GetAxisRaw("Horizontal");
        yAxis = Input.GetAxisRaw("Vertical");
        //attack = Input.GetButtonDown("Attack");
    }
    
    private void Jump()
    {
        if (isWallSliding)
        {
          
            if (Input.GetKeyDown(KeyCode.Space))
            {
                WallJump();
            }
        }
        else
        {
            
            if (Input.GetKeyDown(KeyCode.Space))
            {
                rb.velocity = new Vector2(rb.velocity.x, jumpForce);
            }
        }
    }

    private bool IsGrounded()
    {
        if (Physics2D.Raycast(groundCheck.position, Vector2.down, groundCheckY, collisionMask)
            || Physics2D.Raycast(groundCheck.position + new Vector3(groundCheckX, 0, 0), Vector2.down, groundCheckY, collisionMask)
            || Physics2D.Raycast(groundCheck.position + new Vector3(-groundCheckX, 0, 0), Vector2.down, groundCheckY, collisionMask))
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    private void CheckForWall()
    {
       
        bool wasWallSliding = isWallSliding;
        isWallSliding = false;

        if ((Input.GetAxisRaw("Horizontal") > 0 && wallCheck != null) || 
            (Input.GetAxisRaw("Horizontal") < 0 && wallCheck != null))
        {
            
            float checkDirection = Input.GetAxisRaw("Horizontal") > 0 ? 1f : -1f;
            
            RaycastHit2D hit = Physics2D.BoxCast(
                wallCheck.position, 
                new Vector2(groundCheckX, groundCheckY), 
                0f, 
                new Vector2(checkDirection, 0),
                0.1f,
                wallLayer
            );

            if (hit.collider != null)
            {
                isWallSliding = true;
                wallJumpingDirection = -checkDirection; 
            }
        }

        
        if (wasWallSliding && !isWallSliding)
        {
            StopWallJump();
        }
    }
    
    private void WallJump()
    {
        rb.velocity = new Vector2(wallJumpingDirection * wallJumpingPower.x, wallJumpingPower.y);
        isWallJumping = true;
        Invoke(nameof(StopWallJump), wallJumpingDuration);
    }
    
    private void StopWallJump()
    {
        isWallJumping = false;
    }


    //attack

    private void Attack()
    {
        //timeSinceAttack += Time.deltaTime;
        //if (attack && timeSinceAttack >= timeBetweenAttack)
        //{
        //    timeSinceAttack = 0;


        //    if (yAxis == 0 || yAxis < 0 && IsGrounded())
        //    {
        //        int _recoilLeftOrRight = pState.lookingRight ? 1 : -1;

        //        anim.SetTrigger("Attacking");
        //        audioSource.PlayOneShot(attackSound);
        //        Instantiate(slashEffect, SideAttackTransform);
        //        Hit(SideAttackTransform, SideAttackArea, ref pState.recoilingX, Vector2.left * _recoilLeftOrRight, recoilXSpeed);

        //    }
        //    else if (yAxis > 0)
        //    {
        //        anim.SetTrigger("upSlash");
        //        Instantiate(upSlashEffect, UpAttackTransform);
        //        Hit(UpAttackTransform, UpAttackArea, ref pState.recoilingY, Vector2.up, recoilYSpeed);


        //    }
        //    else if (yAxis < 0 && !IsGrounded())
        //    {
        //        anim.SetTrigger("downSlash");
        //        Instantiate(downSlashEffect, DownAttackTransform);
        //        Hit(DownAttackTransform, DownAttackArea, ref pState.recoilingY, Vector2.down, recoilYSpeed);



        //    }
        //}
    }
    //throwing weap

    //recoil
    private void Recoil()
    {
        //if (pState.recoilingX)
        //{
        //    if (pState.lookingRight)
        //    {
        //        rb.velocity = new Vector2(-recoilXSpeed, 0);
        //    }
        //    else
        //    {
        //        rb.velocity = new Vector2(recoilXSpeed, 0);
        //    }
        //}

        //if (pState.recoilingY)
        //{
        //    rb.gravityScale = 0;
        //    if (yAxis < 0)
        //    {

        //        rb.velocity = new Vector2(rb.velocity.x, recoilYSpeed);
        //    }
        //    else
        //    {
        //        rb.velocity = new Vector2(rb.velocity.x, -recoilYSpeed);
        //    }
        //    airJumpCounter = 0;
        //}
        //else
        //{
        //    rb.gravityScale = gravity;
        //}

        ////Stop recoil
        //if (pState.recoilingX && stepXRecoilded < recoilXStep)
        //{
        //    stepXRecoilded++;
        //}
        //else
        //{
        //    StopRecoilX();
        //}
        //if (pState.recoilingY && stepYRecoilded < recoilYStep)
        //{
        //    stepYRecoilded++;
        //}
        //else
        //{
        //    StopRecoilY();
        //}
        //if (IsGrounded())
        //{
        //    StopRecoilY();
        //}

    }

    private void StopRecoilX()
    {
        //stepXRecoilded = 0;
        //pState.recoilingX = false;
    }
    private void StopRecoilY()
    {
        //stepYRecoilded = 0;
        //pState.recoilingY = false;
    }
    //update jump var
    //flip()
}
